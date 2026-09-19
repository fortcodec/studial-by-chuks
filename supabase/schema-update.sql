-- 1. Saved Study Materials Table (from Vault)
CREATE TABLE IF NOT EXISTS public.saved_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.study_materials(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, material_id)
);

-- 2. Post Likes Table (Globally sync likes)
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, post_id)
);

-- 3. Saved Posts Table (from Feed)
CREATE TABLE IF NOT EXISTS public.saved_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, post_id)
);

-- Note on post_comments: It already exists and uses user_id and post_id. 
-- The feed posts foreign keys (user_id) are currently handled by inner joins 
-- in the app to prevent orphaned posts from showing up if a user is deleted.

-- 4. Tasks & Rewards System
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    reward_coins INTEGER DEFAULT 0 NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.task_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    proof_url TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: The 'task-proofs' bucket must be created in Supabase Storage.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('task-proofs', 'task-proofs', true) ON CONFLICT DO NOTHING;


-- 5. Saved Materials RLS
ALTER TABLE public.saved_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own saved materials" ON public.saved_materials;

CREATE POLICY "Users can manage their own saved materials" 
ON public.saved_materials FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);


-- 6. Task Submissions RLS
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all submissions" ON public.task_submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON public.task_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.task_submissions;

CREATE POLICY "Admins can view all submissions" 
ON public.task_submissions FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can view their own submissions" 
ON public.task_submissions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions" 
ON public.task_submissions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

