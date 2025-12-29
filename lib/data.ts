export interface Product {
  id: string
  name: string
  category: string
  price: number
  rating: number
  reviews: number
  sport: string
  brand: string
  image: string
}

const sports = [
  "Basketball",
  "Soccer",
  "Tennis",
  "Running",
  "Gym",
  "Cycling",
  "Swimming",
  "Golf",
  "Trecking",
  "Winter Sports",
]
const brands = [
  "Peak Performance",
  "Velocity",
  "Apex Sports",
  "Core Athletics",
  "Titan Gear",
  "Swift",
  "Endurance",
  "Nova",
]
const categories = [
  "Footwear",
  "Apparel",
  "Equipment",
  "Accessories",
  "Shoes",
  "Torso",
  "Trecking Gear",
  "Thermal Suits",
  "Wearables",
]

export const products: Product[] = Array.from({ length: 200 }).map((_, i) => {
  const sport = sports[i % sports.length]
  const brand = brands[i % brands.length]
  const category = categories[i % categories.length]
  const rating = Math.floor(Math.random() * 3) + 3 // 3 to 5 stars

  let name = `${brand} ${sport} ${category}`
  if (category === "Shoes" || category === "Footwear") {
    name = `${brand} ${sport} Elite ${i % 2 === 0 ? "Pro" : "Swift"} Shoes`
  } else if (category === "Torso" || category === "Apparel") {
    name = `${brand} ${sport} Performance ${i % 2 === 0 ? "Jersey" : "Compression Top"}`
  } else if (category === "Trecking Gear") {
    name = `${brand} All-Terrain ${i % 2 === 0 ? "Mountain Pack" : "Climbing Harness"}`
  } else if (category === "Thermal Suits") {
    name = `${brand} ${sport} Arctic-Shield Thermal Suit`
  } else if (category === "Wearables") {
    name = `${brand} Smart-Track ${sport} Monitor`
  }

  return {
    id: `prod-${i + 1}`,
    name,
    category,
    price: Math.floor(Math.random() * 150) + 20,
    rating,
    reviews: Math.floor(Math.random() * 500) + 10,
    sport,
    brand,
    image: `/placeholder.svg?height=400&width=400&query=${sport.toLowerCase()}+${category.toLowerCase()}`,
  }
})
