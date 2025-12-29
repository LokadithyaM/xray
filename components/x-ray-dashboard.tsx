"use client"

import { useState, useEffect } from "react"
import {
  getXRayEvents,
  subscribeToXRay,
  clearXRayEvents,
  getXRayStats,
  getGroupStats,
  type XRayEvent,
} from "@/lib/x-ray-logger"
import {
  X,
  Activity,
  Search,
  Filter,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Trophy,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function XRayDashboard({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<XRayEvent[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedSubGroups, setExpandedSubGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Initial load
    setEvents(getXRayEvents())

    // Subscribe to updates
    const unsubscribe = subscribeToXRay((newEvents) => {
      setEvents(newEvents)
    })

    return unsubscribe
  }, [])

  const stats = getXRayStats()

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      searchQuery === "" ||
      event.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(event.details).toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = selectedType === "ALL" || event.type === selectedType

    return matchesSearch && matchesType
  })

  const groupedEvents = () => {
    const groups = new Map<string, XRayEvent[]>()

    filteredEvents.forEach((event) => {
      const key = event.executionId || `ungrouped-${event.id}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(event)
    })

    return Array.from(groups.entries()).map(([execId, evts]) => {
      const passed = evts.filter((e) => e.type === "PRODUCT_PASSED")
      const failed = evts.filter((e) => e.type === "PRODUCT_FILTERED")
      const others = evts.filter((e) => e.type !== "PRODUCT_PASSED" && e.type !== "PRODUCT_FILTERED")

      return {
        executionId: execId,
        events: evts,
        passed,
        failed,
        others,
        stats: execId.startsWith("ungrouped-") ? null : getGroupStats(execId),
      }
    })
  }

  const toggleGroup = (executionId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(executionId)) {
      newExpanded.delete(executionId)
    } else {
      newExpanded.add(executionId)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleSubGroup = (groupId: string) => {
    const newExpanded = new Set(expandedSubGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedSubGroups(newExpanded)
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString() + "." + date.getMilliseconds().toString().padStart(3, "0")
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "FILTER_APPLIED":
        return <Filter className="h-4 w-4" />
      case "SEARCH_EXECUTED":
        return <Search className="h-4 w-4" />
      case "PRODUCT_PASSED":
        return <CheckCircle className="h-4 w-4" />
      case "PRODUCT_FILTERED":
        return <AlertCircle className="h-4 w-4" />
      case "FILTER_RESET":
        return <RotateCcw className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case "FILTER_APPLIED":
        return "text-blue-400"
      case "SEARCH_EXECUTED":
        return "text-purple-400"
      case "PRODUCT_PASSED":
        return "text-green-400"
      case "PRODUCT_FILTERED":
        return "text-red-400"
      case "FILTER_RESET":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  // Added function to render rank badge
  const renderRankBadge = (rank?: number, score?: number) => {
    if (rank === undefined) return null

    const getRankColor = (rank: number) => {
      if (rank === 1) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
      if (rank <= 3) return "bg-blue-500/20 text-blue-300 border-blue-500/50"
      if (rank <= 10) return "bg-purple-500/20 text-purple-300 border-purple-500/50"
      return "bg-white/10 text-white/70 border-white/20"
    }

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${getRankColor(rank)}`}
      >
        <Trophy className="h-3 w-3" />
        Rank #{rank}
        {score !== undefined && <span className="text-white/50">• {score.toFixed(1)} pts</span>}
      </div>
    )
  }

  // Added function to render score breakdown
  const renderScoreBreakdown = (scoreBreakdown: any) => {
    if (!scoreBreakdown) return null

    return (
      <div className="mt-3 p-3 bg-black/30 rounded-lg border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
            <Target className="h-3 w-3" />
            Score Breakdown
          </span>
          <span className="text-xs font-bold text-white">{scoreBreakdown.matchPercentage.toFixed(1)}% relevance</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/40 rounded p-2">
            <div className="text-xs text-white/50 mb-1">Name Score</div>
            <div className="text-sm font-bold text-white">{scoreBreakdown.nameScore.toFixed(1)}</div>
          </div>
          <div className="bg-black/40 rounded p-2">
            <div className="text-xs text-white/50 mb-1">Brand Score</div>
            <div className="text-sm font-bold text-white">{scoreBreakdown.brandScore.toFixed(1)}</div>
          </div>
          <div className="bg-black/40 rounded p-2">
            <div className="text-xs text-white/50 mb-1">Sport Score</div>
            <div className="text-sm font-bold text-white">{scoreBreakdown.sportScore.toFixed(1)}</div>
          </div>
          <div className="bg-black/40 rounded p-2">
            <div className="text-xs text-white/50 mb-1">Category Score</div>
            <div className="text-sm font-bold text-white">{scoreBreakdown.categoryScore.toFixed(1)}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Matched Terms</span>
            <span className="font-semibold text-white">
              {scoreBreakdown.totalMatches} / {scoreBreakdown.searchTerms.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-white/60">Search Terms</span>
            <span className="font-mono text-white/70">"{scoreBreakdown.searchTerms.join('", "')}"</span>
          </div>
        </div>

        {/* Added progress bar for match percentage */}
        <div className="pt-2">
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${scoreBreakdown.matchPercentage}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  const renderEvent = (event: XRayEvent) => (
    <Card key={event.id} className="bg-zinc-800/50 border-white/10 hover:bg-zinc-800 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-1 ${getEventColor(event.type)}`}>{getEventIcon(event.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-wider ${getEventColor(event.type)}`}>
                {event.type.replace("_", " ")}
              </span>
              <span className="text-xs text-white/30">{formatTimestamp(event.timestamp)}</span>
              {/* Display rank badge if available */}
              {renderRankBadge(event.context.rank, event.context.score)}
            </div>
            <p className="text-sm text-white/90 mb-2 leading-relaxed">{event.reason}</p>

            {/* Display score breakdown if available */}
            {event.context.scoreBreakdown && renderScoreBreakdown(event.context.scoreBreakdown)}

            {/* Details Accordion */}
            <details className="group mt-3">
              <summary className="text-xs text-white/50 cursor-pointer hover:text-white/70 list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                View Raw Details
              </summary>
              <div className="mt-3 p-3 bg-black/30 rounded-lg border border-white/5">
                <pre className="text-xs text-white/70 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              </div>
            </details>

            {/* Special rendering for filtered products */}
            {event.type === "PRODUCT_FILTERED" && event.details.checks && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">Failed Checks:</div>
                {Object.entries(event.details.checks).map(([checkName, check]: [string, any]) =>
                  !check.passed ? (
                    <div key={checkName} className="pl-3 border-l-2 border-red-500/50">
                      <div className="text-xs font-medium text-red-400 uppercase">{checkName}</div>
                      <div className="text-xs text-white/60">{check.reason}</div>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm">
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-4xl bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">X-Ray Dashboard</h2>
              <p className="text-xs text-white/50">Real-time filtering decision logs with ranking</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-white/10">
          <Card className="bg-zinc-800 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-white/50">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-800 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-white/50">Filtered Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.byType["PRODUCT_FILTERED"] || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-800 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-white/50">Passed Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats.byType["PRODUCT_PASSED"] || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4 p-6 border-b border-white/10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Search logs..."
              className="bg-zinc-800 border-white/10 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="bg-zinc-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="FILTER_APPLIED">Filter Applied</option>
            <option value="SEARCH_EXECUTED">Search Executed</option>
            <option value="PRODUCT_PASSED">Product Passed</option>
            <option value="PRODUCT_FILTERED">Product Filtered</option>
            <option value="FILTER_RESET">Filter Reset</option>
          </select>
          <select
            className="bg-zinc-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "grouped" | "flat")}
          >
            <option value="grouped">Grouped View</option>
            <option value="flat">Flat View</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => clearXRayEvents()} className="border-white/20">
            Clear Logs
          </Button>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <TrendingDown className="h-16 w-16 text-white/10 mb-4" />
              <p className="text-white/40">No events found</p>
            </div>
          ) : viewMode === "flat" ? (
            filteredEvents.map(renderEvent)
          ) : (
            groupedEvents().map((group) => {
              const isExpanded = expandedGroups.has(group.executionId)
              const isUngrouped = group.executionId.startsWith("ungrouped-")

              if (isUngrouped) {
                // Render ungrouped events directly
                return group.events.map(renderEvent)
              }

              return (
                <Card key={group.executionId} className="bg-zinc-800 border-white/10">
                  <CardContent className="p-0">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.executionId)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-white/50" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-white/50" />
                      )}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-white">
                            Filter Execution - {formatTimestamp(group.stats?.timestamp || Date.now())}
                          </span>
                          <span className="text-xs text-white/40">{group.events.length} events</span>
                        </div>
                        {group.stats && (
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-green-400">{group.stats.passed} passed</span>
                            <span className="text-red-400">{group.stats.filtered} filtered</span>
                            <span className="text-white/40">{group.stats.executionTime}ms execution time</span>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Group Content */}
                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-4 border-t border-white/5">
                        {/* Filter Statistics */}
                        {group.stats && Object.keys(group.stats.filters).length > 0 && (
                          <div className="bg-black/20 rounded-lg p-3 mb-3">
                            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                              Filter Performance
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(group.stats.filters).map(([filterName, stats]) => (
                                <div key={filterName} className="flex items-center justify-between text-xs">
                                  <span className="text-white/60 capitalize">{filterName}:</span>
                                  <span className="text-white/80">
                                    <span className="text-green-400">{stats.passed}</span>
                                    {" / "}
                                    <span className="text-red-400">{stats.failed}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* System Events (Applied, Executed, etc) */}
                        {group.others.length > 0 && <div className="space-y-2">{group.others.map(renderEvent)}</div>}

                        {/* Passed Group */}
                        {group.passed.length > 0 && (
                          <div className="space-y-2">
                            <button
                              onClick={() => toggleSubGroup(`${group.executionId}-passed`)}
                              className="w-full flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-xs font-bold uppercase tracking-wider"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3" />
                                Passed Products ({group.passed.length})
                              </div>
                              {expandedSubGroups.has(`${group.executionId}-passed`) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            {expandedSubGroups.has(`${group.executionId}-passed`) && (
                              <div className="space-y-2 pl-2 border-l border-green-500/20">
                                {group.passed.map(renderEvent)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Failed Group */}
                        {group.failed.length > 0 && (
                          <div className="space-y-2">
                            <button
                              onClick={() => toggleSubGroup(`${group.executionId}-failed`)}
                              className="w-full flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-bold uppercase tracking-wider"
                            >
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-3 w-3" />
                                Failed Products ({group.failed.length})
                              </div>
                              {expandedSubGroups.has(`${group.executionId}-failed`) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            {expandedSubGroups.has(`${group.executionId}-failed`) && (
                              <div className="space-y-2 pl-2 border-l border-red-500/20">
                                {group.failed.map(renderEvent)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default XRayDashboard
