export type XRayEventType =
  | "FILTER_APPLIED"
  | "SEARCH_EXECUTED"
  | "PRODUCT_PASSED"
  | "PRODUCT_FILTERED"
  | "FILTER_RESET"

export interface XRayEvent {
  rank: number
  score: number | undefined
  id: string
  timestamp: number
  type: XRayEventType
  reason: string
  details: Record<string, any>
  context: {
    totalProducts: number
    activeFilters: any
    searchTerm?: string
    traceId?: string // Added traceId to group related events
    rank?: number // Added rank and score to context for search results
    score?: number
    scoreBreakdown?: {
      nameScore: number
      brandScore: number
      sportScore: number
      categoryScore: number
      totalMatches: number
      maxPossibleScore: number
      matchPercentage: number
    }
  }
  groupId?: string
  executionId?: string
}

export interface FilterDecision {
  productId: string
  productName: string
  passed: boolean
  score?: number
  rank?: number
  checks: {
    search?: { passed: boolean; reason: string; details?: any; score?: number }
    sport?: { passed: boolean; reason: string; details?: any }
    brand?: { passed: boolean; reason: string; details?: any }
    category?: { passed: boolean; reason: string; details?: any }
    rating?: { passed: boolean; reason: string; details?: any }
  }
}

let events: XRayEvent[] = []
let currentTraceId: string | null = null // Track active trace session
let currentExecutionId: string | null = null // Track the current filter session
let listeners: ((events: XRayEvent[]) => void)[] = []
const MAX_EVENTS = 1000

export function startXRayTrace(): string {
  currentTraceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return currentTraceId
}

export function endXRayTrace(): void {
  currentTraceId = null
}

export function startExecution(): string {
  currentExecutionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return currentExecutionId
}

export function endExecution(): void {
  currentExecutionId = null
}

export function getCurrentExecutionId(): string | null {
  return currentExecutionId
}

export function logXRayEvent(
  type: XRayEventType,
  reason: string,
  details: Record<string, any>,
  context: any,
  groupId?: string,
): void {
  const event: XRayEvent = {
    id: `xray-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type,
    reason,
    details,
    context: {
      ...context,
      traceId: context?.traceId || currentTraceId || undefined,
    },
    groupId,
    executionId: currentExecutionId || undefined,
    rank: 0,
    score: undefined
  }

  events.unshift(event)

  // Keep only the latest events
  if (events.length > MAX_EVENTS) {
    events = events.slice(0, MAX_EVENTS)
  }

  // Notify all listeners
  listeners.forEach((listener) => listener(events))
}

export function getXRayEvents(): XRayEvent[] {
  return [...events]
}

export function subscribeToXRay(listener: (events: XRayEvent[]) => void): () => void {
  listeners.push(listener)

  // Return unsubscribe function
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function clearXRayEvents(): void {
  events = []
  listeners.forEach((listener) => listener(events))
}

export function getXRayStats() {
  const stats = {
    totalEvents: events.length,
    byType: {} as Record<string, number>,
    recentFailures: [] as XRayEvent[],
  }

  events.forEach((event) => {
    stats.byType[event.type] = (stats.byType[event.type] || 0) + 1

    if (event.type === "PRODUCT_FILTERED") {
      stats.recentFailures.push(event)
    }
  })

  stats.recentFailures = stats.recentFailures.slice(0, 50)

  return stats
}

// Get events grouped by executionId
export function getGroupedEvents(): Map<string, XRayEvent[]> {
  const grouped = new Map<string, XRayEvent[]>()

  events.forEach((event) => {
    const key = event.executionId || event.id
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(event)
  })

  return grouped
}

export function getGroupStats(executionId: string) {
  const groupEvents = events.filter((e) => e.executionId === executionId)

  const stats = {
    totalEvents: groupEvents.length,
    passed: 0,
    filtered: 0,
    executionTime: 0,
    filters: {} as Record<string, { passed: number; failed: number }>,
    timestamp: groupEvents[0]?.timestamp || Date.now(),
  }

  groupEvents.forEach((event) => {
    if (event.type === "PRODUCT_PASSED") stats.passed++
    if (event.type === "PRODUCT_FILTERED") stats.filtered++
    if (event.type === "SEARCH_EXECUTED") {
      stats.executionTime = event.details.executionTime || 0
    }

    // Track filter-specific stats
    if (event.details.checks) {
      Object.entries(event.details.checks).forEach(([filterName, check]: [string, any]) => {
        if (!stats.filters[filterName]) {
          stats.filters[filterName] = { passed: 0, failed: 0 }
        }
        if (check.passed) {
          stats.filters[filterName].passed++
        } else {
          stats.filters[filterName].failed++
        }
      })
    }
  })

  return stats
}

export function logProductPassed(
  productName: string,
  productDetails: Record<string, any>,
  checks: Record<string, any>,
  context: any,
  groupId?: string,
  rank?: number,
  score?: number,
): void {
  logXRayEvent(
    "PRODUCT_PASSED",
    `Product "${productName}" passed all ${Object.keys(checks).length} filter checks${rank !== undefined ? ` (Rank: #${rank}, Score: ${score})` : ""}`,
    {
      product: productDetails,
      checks,
    },
    context,
    groupId,
  )
  if (events.length > 0 && rank !== undefined) {
    events[0].rank = rank
    events[0].score = score
  }
}

export function logProductFiltered(
  productName: string,
  productDetails: Record<string, any>,
  checks: Record<string, any>,
  failedChecks: string[],
  context: any,
  groupId?: string,
  score?: number,
): void {
  const failedCheckReasons = Object.entries(checks)
    .filter(([_, check]: any) => !check.passed)
    .map(([name, check]: any) => `${name}: ${check.reason}`)

  logXRayEvent(
    "PRODUCT_FILTERED",
    `Product "${productName}" (${productDetails.brand}, $${productDetails.price}) filtered out: ${failedCheckReasons.join("; ")}${score !== undefined ? ` (Match Score: ${score})` : ""}`,
    {
      product: productDetails,
      checks,
      failedChecks,
    },
    context,
    groupId,
  )
  if (events.length > 0 && score !== undefined) {
    events[0].score = score
  }
}

export function logSearchExecution(
  duration: number,
  totalProducts: number,
  passedProducts: number,
  filterStats: Record<string, any>,
  context: any,
  groupId?: string,
): void {
  logXRayEvent(
    "SEARCH_EXECUTED",
    `Filter execution completed: ${passedProducts}/${totalProducts} products passed in ${duration}ms`,
    {
      executionTime: duration,
      totalProducts,
      passedProducts,
      filteredProducts: totalProducts - passedProducts,
      filterStats,
    },
    context,
    groupId,
  )
}

export function logProductWithRank(
  productName: string,
  productDetails: Record<string, any>,
  checks: Record<string, any>,
  context: any,
  rank: number,
  score: number,
  scoreBreakdown: any,
  groupId?: string,
): void {
  const isPassed = Object.values(checks).every((check: any) => check.passed)
  
  logXRayEvent(
    isPassed ? "PRODUCT_PASSED" : "PRODUCT_FILTERED",
    isPassed 
      ? `Rank #${rank}: "${productName}" scored ${score.toFixed(2)} points (${scoreBreakdown.matchPercentage.toFixed(1)}% match)`
      : `Product "${productName}" filtered out despite scoring ${score.toFixed(2)} points`,
    {
      product: productDetails,
      checks,
      rank,
      score,
      scoreBreakdown,
    },
    {
      ...context,
      rank,
      score,
      scoreBreakdown,
    },
    groupId,
  )
}

const xrayLogger = {
  log: logXRayEvent,
  getEvents: getXRayEvents,
  subscribe: subscribeToXRay,
  clear: clearXRayEvents,
  getStats: getXRayStats,
  startExecution,
  endExecution,
  getCurrentExecutionId,
  getGroupedEvents,
  getGroupStats,
}

export default xrayLogger
