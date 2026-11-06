/** Rental terms reuse listing price/unit and running/closed availability. */
export function isRentalProperty(category: string, propertyType: string): boolean {
  return category === "realestate" && ["ఇల్లు అద్దెకు (Rent)", "స్థలం/భూమి అద్దెకు (Site/Land Rent)", "లీజ్"].includes(propertyType);
}

/** Price heading for a listing: rent/lease posts say "కిరాయి", others "వస్తువు రేటు". */
export function priceLabel(category: string, propertyType: string): string {
  return isRentalProperty(category, propertyType) ? "కిరాయి" : "వస్తువు రేటు";
}

export function propertyTerms(category: string, propertyType: string, unit: string, stockQty: string) {
  return isRentalProperty(category, propertyType)
    ? { unit: "నెలకు", stock_qty: "" }
    : { unit: unit === "నెలకు" ? "సెంటు" : unit, stock_qty: stockQty };
}