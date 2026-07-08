// Hand-written types mirroring supabase/migrations/0001_init.sql.
// If you have the Supabase CLI + a live project, you can replace this file
// with generated types via:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts

export type InquiryStatus =
  | "new"
  | "contacted"
  | "booked"
  | "completed"
  | "archived";

export type Profile = {
  id: string;
  notification_email: string;
  business_name: string | null;
  created_at: string;
}

export type Album = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PortfolioPhoto = {
  id: string;
  album_id: string;
  storage_path: string;
  filename: string;
  sort_order: number;
  created_at: string;
}

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  event_type: string | null;
  event_date: string | null;
  message: string | null;
  status: InquiryStatus;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type Booking = {
  id: string;
  inquiry_id: string | null;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export type Gallery = {
  id: string;
  client_name: string;
  client_email: string | null;
  title: string;
  access_token: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export type GalleryPhoto = {
  id: string;
  gallery_id: string;
  storage_path: string;
  filename: string;
  sort_order: number;
  created_at: string;
}

export type PhotoSelection = {
  id: string;
  gallery_photo_id: string;
  gallery_id: string;
  is_selected: boolean;
  quantity: number;
  print_size: string | null;
  client_note: string | null;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { notification_email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      albums: {
        Row: Album;
        Insert: Partial<Album> & { title: string; slug: string };
        Update: Partial<Album>;
        Relationships: [];
      };
      portfolio_photos: {
        Row: PortfolioPhoto;
        Insert: Partial<PortfolioPhoto> & {
          album_id: string;
          storage_path: string;
          filename: string;
        };
        Update: Partial<PortfolioPhoto>;
        Relationships: [];
      };
      inquiries: {
        Row: Inquiry;
        Insert: Partial<Inquiry> & { name: string; email: string };
        Update: Partial<Inquiry>;
        Relationships: [];
      };
      bookings: {
        Row: Booking;
        Insert: Partial<Booking> & { title: string; event_date: string };
        Update: Partial<Booking>;
        Relationships: [];
      };
      galleries: {
        Row: Gallery;
        Insert: Partial<Gallery> & {
          client_name: string;
          title: string;
          access_token: string;
        };
        Update: Partial<Gallery>;
        Relationships: [];
      };
      gallery_photos: {
        Row: GalleryPhoto;
        Insert: Partial<GalleryPhoto> & {
          gallery_id: string;
          storage_path: string;
          filename: string;
        };
        Update: Partial<GalleryPhoto>;
        Relationships: [];
      };
      photo_selections: {
        Row: PhotoSelection;
        Insert: Partial<PhotoSelection> & { gallery_photo_id: string; gallery_id: string };
        Update: Partial<PhotoSelection>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
