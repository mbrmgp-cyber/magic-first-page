export type AppointmentSeat = {
  id: string; user_id?: string; level: string; state: string;
  district?: string | null; is_active: boolean;
};

export function canAppointMandalAdmin(isSuper: boolean, userId: string, seat: AppointmentSeat | null) {
  return !!seat && seat.is_active && seat.level === "district_admin" &&
    (isSuper || seat.user_id === userId);
}

export function isApprovedDistrictCandidate(
  profile: { verification_status: string; state: string | null; district: string | null },
  area: { state: string; district: string },
) {
  return profile.verification_status === "approved" && profile.state === area.state && profile.district === area.district;
}

export function appointmentSearchArea(
  isSuper: boolean, seats: AppointmentSeat[], area: { state?: string; district?: string },
) {
  if (isSuper) return area;
  const seat = seats.find(s => s.is_active && s.level === "district_admin" &&
    (!area.state || s.state === area.state) && (!area.district || s.district === area.district));
  if (!seat?.district) throw new Error("మీ జిల్లా పరిధిలో మాత్రమే అడ్మిన్‌ను ఎంచుకోవచ్చు");
  return { state: seat.state, district: seat.district };
}