"use client"

import { useState, useMemo, Suspense } from "react"
import { products } from "@/lib/data"
import { ProductCard } from "@/components/product-card"
import { Search, Filter, X, Star, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import xrayLogger, {
  logProductPassed,
  logProductFiltered,
  logSearchExecution,
  startExecution,
  endExecution,
  logProductWithRank,
} from "@/lib/x-ray-logger"
import XRayDashboard from "@/components/x-ray-dashboard" // Declare the variable here

function SportsStoreContent() {
  const [showDashboard, setShowDashboard] = useState(false)

  // Filters state - only applied when "Apply" is clicked
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedRatings, setSelectedRatings] = useState<number[]>([])

  // Active state - what is currently rendered
  const [activeFilters, setActiveFilters] = useState({
    search: "",
    sports: [] as string[],
    brands: [] as string[],
    categories: [] as string[],
    ratings: [] as number[],
  })

  const filteredProducts = useMemo(() => {
    const executionId = startExecution()
    const startTime = Date.now()
    const results: ((typeof products)[0] & { __score?: number; __rank?: number })[] = []
    const filterDecisions: any[] = []

    // Calculate search scores for all products when search is active
    const calculateSearchScore = (product: (typeof products)[0], searchTerms: string[]) => {
      if (searchTerms.length === 0) return { score: 0, breakdown: null }

      const weights = {
        name: 10, // Name matches are most important
        brand: 6,
        sport: 4,
        category: 3,
      }

      let nameScore = 0
      let brandScore = 0
      let sportScore = 0
      let categoryScore = 0

      const productName = product.name.toLowerCase()
      const productBrand = product.brand.toLowerCase()
      const productSport = product.sport.toLowerCase()
      const productCategory = product.category.toLowerCase()

      searchTerms.forEach((term) => {
        // Exact word match gets full points, partial match gets half
        if (productName.split(" ").includes(term)) {
          nameScore += weights.name
        } else if (productName.includes(term)) {
          nameScore += weights.name * 0.5
        }

        if (productBrand.split(" ").includes(term)) {
          brandScore += weights.brand
        } else if (productBrand.includes(term)) {
          brandScore += weights.brand * 0.5
        }

        if (productSport.split(" ").includes(term)) {
          sportScore += weights.sport
        } else if (productSport.includes(term)) {
          sportScore += weights.sport * 0.5
        }

        if (productCategory.split(" ").includes(term)) {
          categoryScore += weights.category
        } else if (productCategory.includes(term)) {
          categoryScore += weights.category * 0.5
        }
      })

      const totalScore = nameScore + brandScore + sportScore + categoryScore
      const maxPossibleScore = searchTerms.length * (weights.name + weights.brand + weights.sport + weights.category)
      const matchPercentage = (totalScore / maxPossibleScore) * 100

      const matchedTermsCount = searchTerms.filter((term) => {
        return (
          productName.includes(term) ||
          productBrand.includes(term) ||
          productSport.includes(term) ||
          productCategory.includes(term)
        )
      }).length

      return {
        score: totalScore,
        breakdown: {
          nameScore,
          brandScore,
          sportScore,
          categoryScore,
          totalMatches: matchedTermsCount,
          maxPossibleScore,
          matchPercentage,
          searchTerms,
        },
      }
    }

    products.forEach((product) => {
      const decision = {
        productId: product.id,
        productName: product.name,
        price: product.price,
        rating: product.rating,
        brand: product.brand,
        sport: product.sport,
        category: product.category,
        passed: true,
        score: 0,
        checks: {} as any,
      }

      if (activeFilters.search !== "") {
        const searchTerms = activeFilters.search
          .toLowerCase()
          .split(" ")
          .filter((t) => t.length > 0)
        const scoreResult = calculateSearchScore(product, searchTerms)

        decision.score = scoreResult.score
        const breakdown = scoreResult.breakdown!

        // Product passes if it matches at least one term
        const passed = breakdown.totalMatches > 0

        decision.checks.search = {
          passed,
          score: scoreResult.score,
          reason: passed
            ? `Matched ${breakdown.totalMatches}/${searchTerms.length} search terms with score ${scoreResult.score.toFixed(1)} (${breakdown.matchPercentage.toFixed(1)}% relevance). Name: ${breakdown.nameScore.toFixed(1)}, Brand: ${breakdown.brandScore.toFixed(1)}, Sport: ${breakdown.sportScore.toFixed(1)}, Category: ${breakdown.categoryScore.toFixed(1)}`
            : `Failed: No matches found for search terms: "${searchTerms.join('", "')}"`,
          details: {
            searchTerms,
            scoreBreakdown: breakdown,
            matchQuality: breakdown.matchPercentage >= 50 ? "high" : breakdown.matchPercentage >= 25 ? "medium" : "low",
          },
        }

        if (!passed) decision.passed = false
      }

      // Sport filter check
      if (activeFilters.sports.length > 0) {
        const passed = activeFilters.sports.includes(product.sport)
        decision.checks.sport = {
          passed,
          reason: passed
            ? `Sport "${product.sport}" is in selected sports filter`
            : `Failed: Sport "${product.sport}" not in [${activeFilters.sports.join(", ")}]`,
          details: {
            productSport: product.sport,
            selectedSports: activeFilters.sports,
          },
        }

        if (!passed) decision.passed = false
      }

      // Brand filter check
      if (activeFilters.brands.length > 0) {
        const passed = activeFilters.brands.includes(product.brand)
        decision.checks.brand = {
          passed,
          reason: passed
            ? `Brand "${product.brand}" is in selected brands filter`
            : `Failed: Brand "${product.brand}" not in [${activeFilters.brands.join(", ")}]`,
          details: {
            productBrand: product.brand,
            selectedBrands: activeFilters.brands,
          },
        }

        if (!passed) decision.passed = false
      }

      // Category filter check
      if (activeFilters.categories.length > 0) {
        const passed = activeFilters.categories.includes(product.category)
        decision.checks.category = {
          passed,
          reason: passed
            ? `Category "${product.category}" is in selected categories filter`
            : `Failed: Category "${product.category}" not in [${activeFilters.categories.join(", ")}]`,
          details: {
            productCategory: product.category,
            selectedCategories: activeFilters.categories,
          },
        }

        if (!passed) decision.passed = false
      }

      // Rating filter check
      if (activeFilters.ratings.length > 0) {
        const passed = activeFilters.ratings.includes(product.rating)
        decision.checks.rating = {
          passed,
          reason: passed
            ? `Rating ${product.rating} stars is in selected ratings filter`
            : `Failed: Rating ${product.rating} stars not in [${activeFilters.ratings.join(", ")} stars]`,
          details: {
            productRating: product.rating,
            selectedRatings: activeFilters.ratings,
          },
        }

        if (!passed) decision.passed = false
      }

      filterDecisions.push(decision)

      if (decision.passed) {
        results.push({ ...product, __score: decision.score })
      }
    })

    if (activeFilters.search !== "") {
      results.sort((a, b) => (b.__score || 0) - (a.__score || 0))
    }

    results.forEach((product, index) => {
      const rank = index + 1
      const decision = filterDecisions.find((d) => d.productId === product.id)!
      const scoreBreakdown = decision.checks.search?.details?.scoreBreakdown

      if (scoreBreakdown) {
        logProductWithRank(
          product.name,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            rating: product.rating,
            brand: product.brand,
            sport: product.sport,
            category: product.category,
          },
          decision.checks,
          {
            totalProducts: products.length,
            activeFilters,
          },
          rank,
          decision.score,
          scoreBreakdown,
          executionId,
        )
      } else {
        logProductPassed(
          product.name,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            rating: product.rating,
          },
          decision.checks,
          {
            totalProducts: products.length,
            activeFilters,
          },
          executionId,
          rank,
          decision.score,
        )
      }
    })

    // Log filtered products without rank
    filterDecisions.forEach((decision) => {
      if (!decision.passed) {
        const failedChecks = Object.entries(decision.checks)
          .filter(([_, check]: any) => !check.passed)
          .map(([name]) => name)

        logProductFiltered(
          decision.productName,
          {
            id: decision.productId,
            name: decision.productName,
            price: decision.price,
            rating: decision.rating,
            brand: decision.brand,
            sport: decision.sport,
            category: decision.category,
          },
          decision.checks,
          failedChecks,
          {
            totalProducts: products.length,
            activeFilters,
          },
          executionId,
          decision.score,
        )
      }
    })

    const duration = Date.now() - startTime

    logSearchExecution(
      duration,
      products.length,
      results.length,
      {
        totalChecks: filterDecisions.reduce((sum, d) => sum + Object.keys(d.checks).length, 0),
        avgChecksPerProduct: (
          filterDecisions.reduce((sum, d) => sum + Object.keys(d.checks).length, 0) / filterDecisions.length
        ).toFixed(2),
        avgScore:
          results.length > 0 ? (results.reduce((sum, r) => sum + (r.__score || 0), 0) / results.length).toFixed(2) : 0,
        topScore: results.length > 0 ? Math.max(...results.map((r) => r.__score || 0)).toFixed(2) : 0,
      },
      {
        totalProducts: products.length,
        activeFilters,
      },
      executionId,
    )

    endExecution()

    return results
  }, [activeFilters])

  const handleApply = () => {
    const filterCount =
      (searchTerm ? 1 : 0) +
      selectedSports.length +
      selectedBrands.length +
      selectedCategories.length +
      selectedRatings.length

    xrayLogger.log(
      "FILTER_APPLIED",
      `User applied ${filterCount} filter(s): ${[
        searchTerm ? `search="${searchTerm}"` : null,
        selectedSports.length > 0 ? `sports=[${selectedSports.join(", ")}]` : null,
        selectedBrands.length > 0 ? `brands=[${selectedBrands.join(", ")}]` : null,
        selectedCategories.length > 0 ? `categories=[${selectedCategories.join(", ")}]` : null,
        selectedRatings.length > 0 ? `ratings=[${selectedRatings.join(", ")} stars]` : null,
      ]
        .filter(Boolean)
        .join(", ")}`,
      {
        searchTerm,
        selectedSports,
        selectedBrands,
        selectedCategories,
        selectedRatings,
        filterCount,
      },
      {
        totalProducts: products.length,
        activeFilters: {
          search: searchTerm,
          sports: selectedSports,
          brands: selectedBrands,
          categories: selectedCategories,
          ratings: selectedRatings,
        },
      },
    )

    setActiveFilters({
      search: searchTerm,
      sports: selectedSports,
      brands: selectedBrands,
      categories: selectedCategories,
      ratings: selectedRatings,
    })
  }

  const handleReset = () => {
    xrayLogger.log(
      "FILTER_RESET",
      "User reset all filters to default state",
      {
        previousFilters: {
          search: searchTerm,
          sports: selectedSports,
          brands: selectedBrands,
          categories: selectedCategories,
          ratings: selectedRatings,
        },
      },
      {
        totalProducts: products.length,
        activeFilters,
      },
    )

    setSearchTerm("")
    setSelectedSports([])
    setSelectedBrands([])
    setSelectedCategories([])
    setSelectedRatings([])
    setActiveFilters({
      search: "",
      sports: [],
      brands: [],
      categories: [],
      ratings: [],
    })
  }

  const sportsList = Array.from(new Set(products.map((p) => p.sport))).sort()
  const brandsList = Array.from(new Set(products.map((p) => p.brand))).sort()
  const categoriesList = Array.from(new Set(products.map((p) => p.category))).sort()

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {showDashboard && <XRayDashboard onClose={() => setShowDashboard(false)} />}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-white rounded-sm flex items-center justify-center">
              <span className="text-black font-black text-xl italic">S</span>
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Slam Sports</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white/60 hover:text-white">
              Shop
            </Button>
            <Button variant="ghost" className="text-white/60 hover:text-white">
              Events
            </Button>
            <Button
              variant="ghost"
              className="text-white/60 hover:text-white"
              onClick={() => setShowDashboard(!showDashboard)}
            >
              <Activity className="h-4 w-4 mr-2" />
              X-Ray
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white hover:text-black"
            >
              Cart (0)
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 mb-12 text-center md:text-left">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic">Find your Gear</h2>
          <p className="text-white/50 max-w-xl text-lg">
            Elite equipment for the next generation of champions. Browse our curated collection of 200+ pro-grade items.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
          {/* Sidebar Filters */}
          <aside className="lg:col-span-1 flex flex-col gap-8">
            <div className="flex flex-col gap-6 p-6 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Filter By
                </h3>
                <button onClick={handleReset} className="text-xs text-white/40 hover:text-white underline uppercase">
                  Reset
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    placeholder="Search gear..."
                    className="bg-zinc-900 border-white/10 pl-10 focus-visible:ring-white/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleApply}
                  className="w-full bg-white text-black hover:bg-white/90 font-bold uppercase tracking-widest py-6"
                >
                  Apply Selection
                </Button>
              </div>

              <Accordion type="multiple" defaultValue={["sport", "category", "rating"]} className="w-full">
                <AccordionItem value="category" className="border-white/10">
                  <AccordionTrigger className="uppercase font-bold text-xs tracking-widest hover:no-underline">
                    Category
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      {categoriesList.map((cat) => (
                        <div key={cat} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cat-${cat}`}
                            className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
                            checked={selectedCategories.includes(cat)}
                            onCheckedChange={(checked) => {
                              setSelectedCategories(
                                checked ? [...selectedCategories, cat] : selectedCategories.filter((c) => c !== cat),
                              )
                            }}
                          />
                          <Label htmlFor={`cat-${cat}`} className="text-sm font-medium text-white/70">
                            {cat}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sport" className="border-white/10">
                  <AccordionTrigger className="uppercase font-bold text-xs tracking-widest hover:no-underline">
                    Sport
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      {sportsList.map((sport) => (
                        <div key={sport} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sport-${sport}`}
                            className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
                            checked={selectedSports.includes(sport)}
                            onCheckedChange={(checked) => {
                              setSelectedSports(
                                checked ? [...selectedSports, sport] : selectedSports.filter((s) => s !== sport),
                              )
                            }}
                          />
                          <Label htmlFor={`sport-${sport}`} className="text-sm font-medium text-white/70">
                            {sport}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="brand" className="border-white/10">
                  <AccordionTrigger className="uppercase font-bold text-xs tracking-widest hover:no-underline">
                    Brand
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      {brandsList.map((brand) => (
                        <div key={brand} className="flex items-center space-x-2">
                          <Checkbox
                            id={`brand-${brand}`}
                            className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
                            checked={selectedBrands.includes(brand)}
                            onCheckedChange={(checked) => {
                              setSelectedBrands(
                                checked ? [...selectedBrands, brand] : selectedBrands.filter((b) => b !== brand),
                              )
                            }}
                          />
                          <Label htmlFor={`brand-${brand}`} className="text-sm font-medium text-white/70">
                            {brand}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="rating" className="border-white/10">
                  <AccordionTrigger className="uppercase font-bold text-xs tracking-widest hover:no-underline">
                    Reviews
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      {[5, 4, 3].map((rating) => (
                        <div key={rating} className="flex items-center space-x-2">
                          <Checkbox
                            id={`rating-${rating}`}
                            className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
                            checked={selectedRatings.includes(rating)}
                            onCheckedChange={(checked) => {
                              setSelectedRatings(
                                checked ? [...selectedRatings, rating] : selectedRatings.filter((r) => r !== rating),
                              )
                            }}
                          />
                          <Label
                            htmlFor={`rating-${rating}`}
                            className="text-sm font-medium text-white/70 flex items-center gap-1"
                          >
                            {rating} Stars{" "}
                            {Array.from({ length: rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-white text-white" />
                            ))}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <span className="text-sm font-medium text-white/40 uppercase tracking-widest">
                Showing {filteredProducts.length} Results
              </span>
              <div className="flex items-center gap-2">
                {activeFilters.search && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                    "{activeFilters.search}"{" "}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => {
                        setSearchTerm("")
                        setActiveFilters((prev) => ({ ...prev, search: "" }))
                      }}
                    />
                  </span>
                )}
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-20 w-20 rounded-full border border-white/10 flex items-center justify-center mb-6">
                  <Search className="h-10 w-10 text-white/20" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No matching gear found</h3>
                <p className="text-white/40 max-w-xs">
                  Try adjusting your filters or search terms to find what you're looking for.
                </p>
                <Button onClick={handleReset} variant="link" className="text-white underline mt-4">
                  Reset all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-zinc-950 py-20 mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-6 w-6 bg-white rounded-sm flex items-center justify-center">
                <span className="text-black font-black italic">S</span>
              </div>
              <h1 className="text-lg font-black uppercase tracking-tighter italic">Slam Sports</h1>
            </div>
            <p className="text-white/40 max-w-sm mb-8">
              The premier destination for professional sports equipment. From the court to the track, we've got you
              covered with the best gear in the game.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase text-xs tracking-widest mb-6">Shop</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li>
                <a href="#" className="hover:text-white">
                  All Products
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  New Arrivals
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Best Sellers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Sale
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase text-xs tracking-widest mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-white/60">
              <li>
                <a href="#" className="hover:text-white">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Shipping
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Returns
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function SportsStore() {
  return (
    <Suspense fallback={null}>
      <SportsStoreContent />
    </Suspense>
  )
}
