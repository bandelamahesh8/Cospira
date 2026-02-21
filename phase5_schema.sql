-- Phase 5 Migration: Social & Economy

-- 1. Update player_profiles table
ALTER TABLE public.player_profiles 
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 2. Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    friend_id UUID REFERENCES public.player_profiles(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- 3. RLS Policies for Friendships

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own friendships (either as sender or receiver)
CREATE POLICY "Users can view their own friendships" 
ON public.friendships FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Allow users to create requests
CREATE POLICY "Users can create friend requests" 
ON public.friendships FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update friendships (accept/block) where they are involved
CREATE POLICY "Users can update their friendships" 
ON public.friendships FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 4. Create function to search players (for friend requests)
-- (Optional, usually handled by simple select with filter)
