-- Create doctors table for referral management
CREATE TABLE IF NOT EXISTS public.doctors (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_doctors_name ON public.doctors(name);

-- Add RLS policies (matching other master data tables)
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Allow all users to read doctors
CREATE POLICY "Enable read access for all users" ON public.doctors
    FOR SELECT USING (true);

-- Allow all users to insert doctors
CREATE POLICY "Enable insert access for all users" ON public.doctors
    FOR INSERT WITH CHECK (true);

-- Allow all users to update doctors
CREATE POLICY "Enable update access for all users" ON public.doctors
    FOR UPDATE USING (true);

-- Allow all users to delete doctors
CREATE POLICY "Enable delete access for all users" ON public.doctors
    FOR DELETE USING (true);
