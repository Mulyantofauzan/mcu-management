-- Create referral_recipients table
CREATE TABLE IF NOT EXISTS public.referral_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.referral_recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy - Allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read referral_recipients"
ON public.referral_recipients
FOR SELECT
USING (auth.role() = 'authenticated_user');

-- Create RLS Policy - Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert referral_recipients"
ON public.referral_recipients
FOR INSERT
WITH CHECK (auth.role() = 'authenticated_user');

-- Create RLS Policy - Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update referral_recipients"
ON public.referral_recipients
FOR UPDATE
USING (auth.role() = 'authenticated_user')
WITH CHECK (auth.role() = 'authenticated_user');

-- Create RLS Policy - Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete referral_recipients"
ON public.referral_recipients
FOR DELETE
USING (auth.role() = 'authenticated_user');

-- Insert default referral recipients (Penerima Rujukan)
INSERT INTO public.referral_recipients (name) VALUES
('Ts. Dokter Spesialis Penyakit Dalam'),
('Ts. Dokter Spesialis Jantung'),
('Ts. Dokter Spesialis Paru-Paru'),
('Ts. Dokter Spesialis Mata'),
('Ts. Dokter Spesialis THT'),
('Ts. Dokter Spesialis Neurologi'),
('Ts. Dokter Spesialis Ortopedi'),
('Ts. Dokter Spesialis Bedah Umum'),
('Ts. Dokter Spesialis Gigi'),
('Ts. Dokter Spesialis Psikiatri'),
('Ts. Dokter Spesialis Dermatologi'),
('Ts. Dokter Spesialis Gastroenterologi')
ON CONFLICT (name) DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_referral_recipients_name ON public.referral_recipients(name);
