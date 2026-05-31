import { createClient } from "@/lib/supabase/server";

export type HouseholdMember = {
  id: string;
  userId: string;
  fullName: string | null;
  email: string | null;
  monthlySalary: number;
  role: string;
  /** Share of the household budget, 0–100, derived from salaries. */
  contributionPercent: number;
};

export type ActiveHousehold = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  members: HouseholdMember[];
  /** Sum of all member salaries — the salary-derived monthly budget base. */
  totalSalaries: number;
  /** The id of the currently signed-in user. */
  currentUserId: string;
};

type MemberRow = {
  id: string;
  user_id: string;
  monthly_salary: number | string;
  role: string;
  profiles: { full_name: string | null; email: string | null }[] | { full_name: string | null; email: string | null } | null;
};

/**
 * Returns the signed-in user's active household (the first one they joined),
 * with members and their salary-derived contribution percentages — or null if
 * they have no household yet (i.e. needs onboarding).
 */
export async function getActiveHousehold(): Promise<ActiveHousehold | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;
  const householdId = membership.household_id as string;

  const { data: household } = await supabase
    .from("households")
    .select("id, name, owner_id, invite_code")
    .eq("id", householdId)
    .single();

  if (!household) return null;

  const { data: rows } = await supabase
    .from("household_members")
    .select("id, user_id, monthly_salary, role, profiles(full_name, email)")
    .eq("household_id", householdId)
    .order("joined_at", { ascending: true });

  const memberRows = (rows ?? []) as MemberRow[];

  const salaries = memberRows.map((r) => Number(r.monthly_salary) || 0);
  const totalSalaries = salaries.reduce((sum, s) => sum + s, 0);

  const members: HouseholdMember[] = memberRows.map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const salary = Number(r.monthly_salary) || 0;
    return {
      id: r.id,
      userId: r.user_id,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      monthlySalary: salary,
      role: r.role,
      contributionPercent: totalSalaries > 0 ? (salary / totalSalaries) * 100 : 0,
    };
  });

  return {
    id: household.id as string,
    name: household.name as string,
    ownerId: household.owner_id as string,
    inviteCode: household.invite_code as string,
    members,
    totalSalaries,
    currentUserId: user.id,
  };
}
