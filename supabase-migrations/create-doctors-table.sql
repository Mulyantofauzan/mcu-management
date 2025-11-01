-- Create doctors table for referral management
CREATE TABLE IF NOT EXISTS public.doctors (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_doctors_name ON public.doctors(name);

-- Add RLS policies
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read doctors
CREATE POLICY "Allow all authenticated users to read doctors"
    ON public.doctors
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow admin users to insert doctors
CREATE POLICY "Allow admin users to insert doctors"
    ON public.doctors
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'Administrator'
        )
    );

-- Allow admin users to update doctors
CREATE POLICY "Allow admin users to update doctors"
    ON public.doctors
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'Administrator'
        )
    );

-- Allow admin users to delete doctors
CREATE POLICY "Allow admin users to delete doctors"
    ON public.doctors
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'Administrator'
        )
    );
