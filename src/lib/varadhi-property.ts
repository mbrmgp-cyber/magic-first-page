/** Rental terms reuse listing price/unit and running/closed availability. */
export function isRentalProperty(category: string, propertyType: string): boolean {
  return category === "realestate" && ["ఇల్లు అద్దెకు (Rent)", "లీజ్"].includes(propertyType);
}

export function propertyTerms(category: string, propertyType: string, unit: string, stockQty: string) {
  return isRentalProperty(category, propertyType)
    ? { unit: "నెలకు", stock_qty: "" }
    : { unit: unit === "నెలకు" ? "సెంటు" : unit, stock_qty: stockQty };
}