-- Remove SharedTodo (Meet add-on collaborative list); model removed from schema.
-- Safe if table never existed (fresh DB).
DROP TABLE IF EXISTS "SharedTodo";
