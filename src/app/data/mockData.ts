export const events = [
  {
    id: 1,
    title: "Summer Music Festival 2026",
    category: "Concerts",
    date: "2026-07-15",
    time: "18:00",
    location: "Central Park, New York",
    venue: "Main Stage Arena",
    price: 89,
    image: "https://images.unsplash.com/photo-1656283384093-1e227e621fad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGNvbmNlcnQlMjBjcm93ZHxlbnwxfHx8fDE3NzI2ODY2NDV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Join us for an unforgettable evening featuring top artists from around the world. Experience live music, amazing atmosphere, and create memories that will last a lifetime.",
    organizer: "EventPro Productions",
    capacity: 5000,
    attendees: 3420,
    featured: true,
    tags: ["music", "outdoor", "festival"],
    ticketTypes: [
      { type: "Early Bird", price: 69, available: 0, sold: true },
      { type: "Standard", price: 89, available: 1200 },
      { type: "VIP", price: 159, available: 80 }
    ]
  },
  {
    id: 2,
    title: "NBA Championship Finals",
    category: "Sports",
    date: "2026-06-20",
    time: "20:00",
    location: "Madison Square Garden, NY",
    venue: "Madison Square Garden",
    price: 250,
    image: "https://images.unsplash.com/photo-1764050359179-517599dab87b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBzdGFkaXVtJTIwZXZlbnR8ZW58MXx8fHwxNzcyNzA5NjgwfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Witness history in the making! The NBA Championship Finals bring you edge-of-your-seat action as the best teams battle for the ultimate prize.",
    organizer: "NBA Events",
    capacity: 20000,
    attendees: 18500,
    featured: true,
    tags: ["basketball", "sports", "championship"],
    ticketTypes: [
      { type: "Upper Deck", price: 150, available: 500 },
      { type: "Lower Bowl", price: 250, available: 200 },
      { type: "Courtside", price: 1200, available: 12 }
    ]
  },
  {
    id: 3,
    title: "Tech Summit 2026",
    category: "Conferences",
    date: "2026-09-10",
    time: "09:00",
    location: "Convention Center, SF",
    venue: "Moscone Center",
    price: 299,
    image: "https://images.unsplash.com/photo-1769798643237-8642a3fbe5bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGNvbmZlcmVuY2UlMjBhdWRpZW5jZXxlbnwxfHx8fDE3NzI3MjMwNzd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Connect with industry leaders, learn about cutting-edge technologies, and network with professionals from around the globe at the premier tech conference.",
    organizer: "TechVentures Inc",
    capacity: 3000,
    attendees: 2100,
    featured: true,
    tags: ["technology", "business", "networking"],
    ticketTypes: [
      { type: "Standard", price: 299, available: 400 },
      { type: "Premium", price: 499, available: 150 },
      { type: "All-Access", price: 799, available: 50 }
    ]
  },
  {
    id: 4,
    title: "Electric Nights Festival",
    category: "Festivals",
    date: "2026-08-22",
    time: "16:00",
    location: "Desert Valley, Nevada",
    venue: "Open Air Festival Grounds",
    price: 129,
    image: "https://images.unsplash.com/photo-1764670085300-7951b9132433?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvdXRkb29yJTIwbXVzaWMlMjBmZXN0aXZhbHxlbnwxfHx8fDE3NzI3MDc5NDN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "A three-day electronic music extravaganza featuring world-renowned DJs, art installations, and an unforgettable festival experience.",
    organizer: "Festival Productions",
    capacity: 15000,
    attendees: 12300,
    featured: false,
    tags: ["edm", "festival", "camping"],
    ticketTypes: [
      { type: "General Admission", price: 129, available: 2000 },
      { type: "VIP Pass", price: 299, available: 300 },
      { type: "Platinum", price: 599, available: 100 }
    ]
  },
  {
    id: 5,
    title: "Digital Marketing Masterclass",
    category: "Workshops",
    date: "2026-05-18",
    time: "10:00",
    location: "Learning Hub, Boston",
    venue: "Innovation Center",
    price: 149,
    image: "https://images.unsplash.com/photo-1728933102332-a4f1a281a621?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b3Jrc2hvcCUyMHNlbWluYXIlMjBwZW9wbGV8ZW58MXx8fHwxNzcyNzM1MTk1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Master the art of digital marketing with hands-on workshops, expert insights, and proven strategies to grow your business online.",
    organizer: "Marketing Academy",
    capacity: 150,
    attendees: 98,
    featured: false,
    tags: ["education", "marketing", "workshop"],
    ticketTypes: [
      { type: "Early Bird", price: 129, available: 0, sold: true },
      { type: "Standard", price: 149, available: 42 }
    ]
  },
  {
    id: 6,
    title: "Culinary Arts Festival",
    category: "Festivals",
    date: "2026-06-05",
    time: "12:00",
    location: "Harbor Front, Miami",
    venue: "Waterfront Plaza",
    price: 45,
    image: "https://images.unsplash.com/photo-1760280347330-54c4b2b2bcc5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZmVzdGl2YWwlMjBnb3VybWV0fGVufDF8fHx8MTc3MjY0ODkzNXww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Taste your way through Miami's best cuisine! Sample dishes from top chefs, attend cooking demos, and enjoy live entertainment.",
    organizer: "Gourmet Events",
    capacity: 5000,
    attendees: 4200,
    featured: false,
    tags: ["food", "cooking", "tasting"],
    ticketTypes: [
      { type: "Day Pass", price: 45, available: 800 },
      { type: "Weekend Pass", price: 75, available: 200 }
    ]
  },
  {
    id: 7,
    title: "Startup Innovation Summit",
    category: "Conferences",
    date: "2026-10-15",
    time: "08:30",
    location: "Tech Hub, Austin",
    venue: "Convention Center",
    price: 199,
    image: "https://images.unsplash.com/photo-1700936655767-7049129f1995?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNoJTIwc3RhcnR1cCUyMGV2ZW50fGVufDF8fHx8MTc3Mjc0MDk0Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Network with investors, learn from successful founders, and discover the latest trends in the startup ecosystem.",
    organizer: "Startup Alliance",
    capacity: 1000,
    attendees: 750,
    featured: false,
    tags: ["startup", "entrepreneurship", "networking"],
    ticketTypes: [
      { type: "Founder", price: 199, available: 150 },
      { type: "Investor", price: 299, available: 50 }
    ]
  },
  {
    id: 8,
    title: "Jazz & Blues Night",
    category: "Concerts",
    date: "2026-04-28",
    time: "19:30",
    location: "Blue Note Club, Chicago",
    venue: "Blue Note Jazz Club",
    price: 65,
    image: "https://images.unsplash.com/photo-1708743536025-ecfe7ffb75b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXp6JTIwY29uY2VydCUyMGxpdmV8ZW58MXx8fHwxNzcyNzQwOTQ2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "An intimate evening of soulful jazz and blues performances by Grammy-winning artists in Chicago's legendary jazz venue.",
    organizer: "Blue Note Productions",
    capacity: 300,
    attendees: 280,
    featured: false,
    tags: ["jazz", "blues", "live music"],
    ticketTypes: [
      { type: "General Seating", price: 65, available: 15 },
      { type: "VIP Table", price: 120, available: 3 }
    ]
  }
];

export const foodItems = [
  {
    id: 1,
    name: "Classic Burger & Fries",
    category: "Meals",
    price: 12.99,
    image: "https://images.unsplash.com/photo-1623610934157-0fcb6d50e90f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBmcmllcyUyMGZvb2R8ZW58MXx8fHwxNzcyNzMzNjIzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Juicy beef burger with cheese, lettuce, tomato, and crispy fries"
  },
  {
    id: 2,
    name: "Margherita Pizza",
    category: "Meals",
    price: 14.99,
    image: "https://images.unsplash.com/photo-1637438333503-5e218b937aef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaXp6YSUyMHNsaWNlJTIwZGVsaWNpb3VzfGVufDF8fHx8MTc3MjY1Mzc1MHww&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Fresh mozzarella, tomato sauce, and basil on wood-fired crust"
  },
  {
    id: 3,
    name: "Signature Cocktail",
    category: "Drinks",
    price: 9.99,
    image: "https://images.unsplash.com/photo-1730390772308-0ae7f139d042?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2NrdGFpbCUyMGRyaW5rJTIwZ2xhc3N8ZW58MXx8fHwxNzcyNjIzNTQ5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Refreshing house special cocktail with fresh fruits"
  },
  {
    id: 4,
    name: "Gourmet Popcorn",
    category: "Snacks",
    price: 5.99,
    image: "https://images.unsplash.com/photo-1768582870566-d1ea815a7545?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3Bjb3JuJTIwc25hY2slMjBtb3ZpZXxlbnwxfHx8fDE3NzI3NDA5NDh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    description: "Sweet and savory gourmet popcorn mix"
  },
  {
    id: 5,
    name: "Nachos Supreme",
    category: "Snacks",
    price: 8.99,
    image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400",
    description: "Loaded nachos with cheese, jalapeños, sour cream, and guacamole"
  },
  {
    id: 6,
    name: "Soft Drink",
    category: "Drinks",
    price: 3.99,
    image: "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400",
    description: "Choice of Coke, Sprite, or Fanta"
  },
  {
    id: 7,
    name: "Hot Dog Combo",
    category: "Meals",
    price: 7.99,
    image: "https://images.unsplash.com/photo-1612392062422-ef19b42f74df?w=400",
    description: "All-beef hot dog with chips and a drink"
  },
  {
    id: 8,
    name: "Pretzel Bites",
    category: "Snacks",
    price: 6.99,
    image: "https://images.unsplash.com/photo-1570145820386-34d42a3f3db4?w=400",
    description: "Warm pretzel bites with cheese sauce"
  }
];

export const whiteMarketListings = [
  {
    id: 1,
    eventId: 1,
    eventTitle: "Summer Music Festival 2026",
    eventDate: "2026-07-15",
    ticketType: "VIP",
    originalPrice: 159,
    resalePrice: 140,
    seller: {
      name: "Sarah M.",
      rating: 4.8,
      verified: true,
      sales: 12
    },
    quantity: 2,
    section: "Section A",
    row: "Row 5"
  },
  {
    id: 2,
    eventId: 2,
    eventTitle: "NBA Championship Finals",
    eventDate: "2026-06-20",
    ticketType: "Lower Bowl",
    originalPrice: 250,
    resalePrice: 280,
    seller: {
      name: "Mike J.",
      rating: 4.9,
      verified: true,
      sales: 28
    },
    quantity: 1,
    section: "Section 102",
    row: "Row 12"
  },
  {
    id: 3,
    eventId: 3,
    eventTitle: "Tech Summit 2026",
    eventDate: "2026-09-10",
    ticketType: "Premium",
    originalPrice: 499,
    resalePrice: 450,
    seller: {
      name: "Jennifer L.",
      rating: 5.0,
      verified: true,
      sales: 8
    },
    quantity: 1,
    section: "Main Hall",
    row: "Front Section"
  }
];

export const userTickets = [
  {
    id: "TKT-2026-001",
    eventId: 1,
    eventTitle: "Summer Music Festival 2026",
    eventDate: "2026-07-15",
    eventTime: "18:00",
    location: "Central Park, New York",
    ticketType: "VIP",
    price: 159,
    purchaseDate: "2026-03-01",
    qrCode: "QR-SMFEST-VIP-001",
    status: "active",
    faceIdRegistered: true
  },
  {
    id: "TKT-2026-002",
    eventId: 3,
    eventTitle: "Tech Summit 2026",
    eventDate: "2026-09-10",
    eventTime: "09:00",
    location: "Convention Center, SF",
    ticketType: "Standard",
    price: 299,
    purchaseDate: "2026-02-15",
    qrCode: "QR-TECH-STD-002",
    status: "active",
    faceIdRegistered: true
  }
];

export const categories = [
  { name: "Concerts", icon: "Music", count: 234 },
  { name: "Sports", icon: "Trophy", count: 156 },
  { name: "Conferences", icon: "Briefcase", count: 89 },
  { name: "Festivals", icon: "Sparkles", count: 145 },
  { name: "Workshops", icon: "GraduationCap", count: 67 }
];
