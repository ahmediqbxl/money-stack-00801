
DROP POLICY IF EXISTS "Users can view default and their own categories" ON public.categories;

CREATE POLICY "Authenticated users can view default and their own categories"
ON public.categories
FOR SELECT
TO authenticated
USING ((is_default = true) OR (auth.uid() = user_id));
