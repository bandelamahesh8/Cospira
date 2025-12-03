-- Add foreign key relationship for profiles lookup
ALTER TABLE public.messages 
ADD CONSTRAINT messages_user_id_fkey_profiles 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;