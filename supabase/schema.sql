-- 1. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    reward_coins INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Task Submissions Table
CREATE TABLE IF NOT EXISTS public.task_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    proof_url TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Study Materials Table
CREATE TABLE IF NOT EXISTS public.study_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    course_code TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. RPC for Approving Task Submissions securely
CREATE OR REPLACE FUNCTION approve_task_submission(
    p_submission_id UUID,
    p_admin_id UUID
) RETURNS void AS $$
DECLARE
    v_task_id UUID;
    v_user_id UUID;
    v_reward_coins INTEGER;
    v_status TEXT;
    v_admin_role TEXT;
BEGIN
    -- Check if caller is admin
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
    IF v_admin_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized. Only admins can approve submissions.';
    END IF;

    -- Get submission details
    SELECT task_id, user_id, status INTO v_task_id, v_user_id, v_status 
    FROM public.task_submissions 
    WHERE id = p_submission_id FOR UPDATE;

    IF v_status != 'pending' THEN
        RAISE EXCEPTION 'Submission is not in a pending state.';
    END IF;

    -- Get task reward
    SELECT reward_coins INTO v_reward_coins FROM public.tasks WHERE id = v_task_id;

    -- Update submission status
    UPDATE public.task_submissions 
    SET status = 'approved' 
    WHERE id = p_submission_id;

    -- Credit C-Coins to user
    UPDATE public.profiles 
    SET c_coins = COALESCE(c_coins, 0) + v_reward_coins 
    WHERE id = v_user_id;

    -- Log transaction
    INSERT INTO public.c_coin_transactions (user_id, amount, description, transaction_type)
    VALUES (v_user_id, '+' || v_reward_coins, 'Task Reward Approved', 'credit');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- IMPORTANT: STORAGE BUCKET INSTRUCTIONS (Run in Supabase Dashboard UI manually)
-- 1. Go to "Storage" in Supabase
-- 2. Create a bucket named "task-proofs" (Make it Public)
-- 3. Create a bucket named "study-materials" (Make it Public)
-- 4. Allow INSERT access for authenticated users to upload proofs and materials
