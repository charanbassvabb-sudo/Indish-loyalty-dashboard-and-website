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
    address: "Shop No. 10, East Park Mall, next to Sikale Deco, Lusaka, Zambia",
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
    // Mon–Thu and Fri–Sun differ, and Lusaka is additionally closed on the
    // 2nd and 3rd Monday of every month (see isRecurringlyClosed in
    // data/reservation.ts, enforced automatically — not a manual admin
    // toggle — and mirrored server-side in reservation.validator.ts /
    // availability.controller.ts).
    hours: "Mon–Thu 11:30–22:00 · Fri–Sun 11:00–23:00 (closed 2nd & 3rd Mon of the month)",
  },
  kitwe: {
    id: "kitwe",
    name: "Indish — Kitwe",
    tagline: "Copperbelt's most loved curries and biryani",
    address: "Shop No. 32, Food Court, ECL Mall, Parklands, Kitwe, Zambia",
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
    // Mon–Thu and Fri–Sun differ, and Kitwe is additionally closed on the
    // 2nd Tuesday of every month (see isRecurringlyClosed in
    // data/reservation.ts, enforced automatically — not a manual admin
    // toggle — and mirrored server-side in reservation.validator.ts /
    // availability.controller.ts).
    hours: "Mon–Thu 11:00–22:00 · Fri–Sun 11:00–22:30 (closed 2nd Tue of the month)",
  },
};

export const branchList = Object.values(branches);
