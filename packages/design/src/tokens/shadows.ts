export const shadow = {
  card: "0 22px 50px -26px rgba(20,33,61,0.42), 0 4px 14px -8px rgba(20,33,61,0.16)",
  cardSoft: "0 8px 22px -18px rgba(20,33,61,0.2)",
  floating: "0 8px 20px -8px rgba(20,33,61,0.3)",
  sheet: "0 -14px 40px -16px rgba(20,33,61,0.22)",
  button: "0 10px 22px -10px rgba(252,163,17,0.6)",
} as const;

export const elevation = {
  card: {
    shadowColor: "#14213d",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  cardSoft: {
    shadowColor: "#14213d",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  floating: {
    shadowColor: "#14213d",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

export type Shadow = keyof typeof shadow;
