-- Create landing_pages table
CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create landing_page_elements table
CREATE TABLE public.landing_page_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id UUID NOT NULL,
  element_type TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT landing_page_elements_landing_page_id_fkey 
    FOREIGN KEY (landing_page_id) 
    REFERENCES public.landing_pages(id) 
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_elements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for landing_pages
CREATE POLICY "Users can view their own landing pages"
  ON public.landing_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own landing pages"
  ON public.landing_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own landing pages"
  ON public.landing_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own landing pages"
  ON public.landing_pages FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for landing_page_elements
CREATE POLICY "Users can view elements of their landing pages"
  ON public.landing_page_elements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.landing_pages
      WHERE landing_pages.id = landing_page_elements.landing_page_id
      AND landing_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create elements for their landing pages"
  ON public.landing_page_elements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.landing_pages
      WHERE landing_pages.id = landing_page_elements.landing_page_id
      AND landing_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update elements of their landing pages"
  ON public.landing_page_elements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.landing_pages
      WHERE landing_pages.id = landing_page_elements.landing_page_id
      AND landing_pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete elements of their landing pages"
  ON public.landing_page_elements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.landing_pages
      WHERE landing_pages.id = landing_page_elements.landing_page_id
      AND landing_pages.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_landing_pages_user_id ON public.landing_pages(user_id);
CREATE INDEX idx_landing_pages_slug ON public.landing_pages(slug);
CREATE INDEX idx_landing_page_elements_landing_page_id ON public.landing_page_elements(landing_page_id);
CREATE INDEX idx_landing_page_elements_position ON public.landing_page_elements(position);

-- Create trigger for updated_at
CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landing_page_elements_updated_at
  BEFORE UPDATE ON public.landing_page_elements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();