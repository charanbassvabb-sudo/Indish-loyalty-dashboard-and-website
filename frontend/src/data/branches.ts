import type { Branch } from "@/types";
import lusakaPatio from "@/assets/images/lusaka-patio.jpg";
import kitweHall from "@/assets/images/kitwe-hall.jpg";
import kitweBarLounge from "@/assets/images/kitwe-bar-lounge.jpg";
import kitweDining from "@/assets/images/kitwe-dining.jpg";
import kitweLoungeSeating from "@/assets/images/kitwe-lounge-seating.jpg";
import kitweEntrance from "@/assets/images/kitwe-entrance.jpg";

export const branches: Record<Branch["id"], Branch> = {
  lusaka: {
    id: "lusaka",
    name: "Indish — Lusaka",
    tagline: "Tandoor fire and fusion plates on EastPark's terrace",
    address: "Shop No. K72, East Park Mall, next to Game Zone, Lusaka, Zambia",
    plusCode: "J84F+79 Lusaka",
    phone: "0976309999",
    rating: 4.4,
    reviewCount: 277,
    seating: ["indoor", "outdoor"],
    heroImage: lusakaPatio,
    heroImageBlurKey: "lusaka-patio.jpg",
    interiorImage: lusakaPatio,
    gallery: [lusakaPatio],
    galleryBlurKeys: ["lusaka-patio.jpg"],
    hours: "11:30 – 22:00 daily",
  },
  kitwe: {
    id: "kitwe",
    name: "Indish — Kitwe",
    tagline: "Copperbelt's most loved curries and biryani",
    address: "Shop No. 32, ECL Mall, Block B / Unit 10, next to Sikale Wood, Parklands, Kitwe, Zambia",
    plusCode: "56R6+PJ Kitwe",
    phone: "0963240240",
    rating: 4.4,
    reviewCount: 281,
    seating: ["indoor"],
    heroImage: kitweHall,
    heroImageBlurKey: "kitwe-hall.jpg",
    interiorImage: kitweLoungeSeating,
    gallery: [kitweHall, kitweBarLounge, kitweDining, kitweLoungeSeating, kitweEntrance],
    galleryBlurKeys: [
      "kitwe-hall.jpg",
      "kitwe-bar-lounge.jpg",
      "kitwe-dining.jpg",
      "kitwe-lounge-seating.jpg",
      "kitwe-entrance.jpg",
    ],
    hours: "11:30 – 22:00 daily",
  },
};

export const branchList = Object.values(branches);
