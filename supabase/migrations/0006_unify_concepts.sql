-- ============================================================================
-- 0006 — Unify concepts into budgets.
--
-- A budget IS now the expense concept (it already has a name, icon, color,
-- amount and split). The separate `categories` ("conceptes") layer is removed:
-- expenses and alerts reference budgets only. A budget's `amount` is "how much
-- you can spend" on that concept.
--
-- NOTE: the receipts/OCR migration (pending on its own branch) becomes 0007 and
-- is still applied last. Apply this after 0001–0005.
-- ============================================================================

-- Preserve data: route category-linked expenses to the category's budget when
-- they aren't already assigned to one directly.
update public.expenses e
set budget_id = c.budget_id
from public.categories c
where e.category_id = c.id
  and e.budget_id is null
  and c.budget_id is not null;

-- Category-scoped alerts no longer have a target — remove them. (Budget and
-- whole-household alerts are kept.)
delete from public.alerts where category_id is not null;

-- Drop the category references, then the table itself (cascades its policies).
alter table public.expenses drop column category_id;
alter table public.alerts drop column category_id;
drop table public.categories;
