
-- CARS
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  year INT NOT NULL,
  color TEXT,
  transmission TEXT,
  fuel_type TEXT,
  description TEXT,
  selling_price BIGINT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  image_url TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cars TO anon, authenticated;
GRANT ALL ON public.cars TO service_role;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cars" ON public.cars FOR SELECT USING (true);

-- WALLET USERS
CREATE TABLE public.wallet_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_users TO anon, authenticated;
GRANT ALL ON public.wallet_users TO service_role;
ALTER TABLE public.wallet_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read wallets" ON public.wallet_users FOR SELECT USING (true);
CREATE POLICY "Anyone insert wallet" ON public.wallet_users FOR INSERT WITH CHECK (true);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  total_idr BIGINT NOT NULL,
  total_usdc NUMERIC(20, 6) NOT NULL,
  tx_signature TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.transactions TO anon, authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Anyone create transaction" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone update transaction" ON public.transactions FOR UPDATE USING (true);

-- TRANSACTION ITEMS
CREATE TABLE public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES public.cars(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price BIGINT NOT NULL,
  car_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.transaction_items TO anon, authenticated;
GRANT ALL ON public.transaction_items TO service_role;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read items" ON public.transaction_items FOR SELECT USING (true);
CREATE POLICY "Anyone insert items" ON public.transaction_items FOR INSERT WITH CHECK (true);

-- SETTINGS (single row)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_name TEXT NOT NULL DEFAULT 'Solana Auto',
  dealer_logo TEXT,
  dealer_address TEXT,
  dealer_phone TEXT,
  dealer_email TEXT,
  dealer_website TEXT,
  dealer_wallet TEXT,
  solana_network TEXT NOT NULL DEFAULT 'devnet',
  idr_per_usdc NUMERIC(20, 2) NOT NULL DEFAULT 16000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Anyone update settings" ON public.settings FOR UPDATE USING (true);
CREATE POLICY "Anyone insert settings" ON public.settings FOR INSERT WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER cars_touch BEFORE UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tx_touch BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- seed cars
INSERT INTO public.cars (name, brand, year, color, transmission, fuel_type, selling_price, stock, description, status) VALUES
('Toyota Avanza G 2022', 'Toyota', 2022, 'Silver', 'Manual', 'Bensin', 235000000, 5, 'MPV keluarga andalan dengan kabin lapang dan biaya perawatan rendah.', 'available'),
('Honda Brio RS 2023', 'Honda', 2023, 'Merah', 'CVT', 'Bensin', 245000000, 8, 'Hatchback sporty bertenaga irit dan lincah di perkotaan.', 'available'),
('Toyota Fortuner VRZ 2021', 'Toyota', 2021, 'Hitam', 'Automatic', 'Diesel', 525000000, 2, 'SUV tangguh dengan mesin diesel responsif dan tampilan gagah.', 'low'),
('Mitsubishi Pajero Sport Dakar 2022', 'Mitsubishi', 2022, 'Putih', 'Automatic', 'Diesel', 575000000, 3, 'SUV premium dengan performa Dakar dan teknologi canggih.', 'available'),
('Honda HR-V SE 2023', 'Honda', 2023, 'Abu-abu', 'CVT', 'Bensin', 395000000, 6, 'Compact SUV stylish dengan fitur lengkap dan handling presisi.', 'available'),
('Toyota Raize GR Sport 2024', 'Toyota', 2024, 'Putih Merah', 'CVT', 'Bensin', 310000000, 10, 'SUV compact dengan sentuhan GR Sport, bertenaga dan agresif.', 'available'),
('Hyundai Creta Prime 2023', 'Hyundai', 2023, 'Biru', 'Automatic', 'Bensin', 365000000, 4, 'SUV modern dengan desain bold dan kabin mewah.', 'available'),
('Wuling Air EV Long Range 2024', 'Wuling', 2024, 'Hijau Mint', 'Automatic', 'Listrik', 295000000, 7, 'Mobil listrik kompak ramah lingkungan dengan jangkauan luas.', 'available');

INSERT INTO public.settings (dealer_name, dealer_address, dealer_phone, dealer_email, dealer_website, dealer_wallet, solana_network, idr_per_usdc)
VALUES ('Solana Auto Showroom', 'Jl. Sudirman No. 88, Jakarta Selatan', '+62 21 5550 1234', 'sales@solanaauto.id', 'https://solanaauto.id', '', 'devnet', 16000);
