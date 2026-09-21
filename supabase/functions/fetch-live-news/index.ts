import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const GNEWS_API_KEY = Deno.env.get('GNEWS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  try {
    // 1. Initialize Supabase Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Check if API key is set
    if (!GNEWS_API_KEY) {
      throw new Error("Missing GNEWS_API_KEY");
    }

    // 3. Fetch live news from GNews API
    const query = encodeURIComponent('"Nigeria education" OR "ASUU" OR "JAMB" OR "scholarships"');
    const response = await fetch(`https://gnews.io/api/v4/search?q=${query}&lang=en&country=ng&max=10&apikey=${GNEWS_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`GNews API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const articles = data.articles || [];
    
    if (articles.length === 0) {
      return new Response(JSON.stringify({ message: "No articles found" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Delete old rows (older than 24 hours) to prevent bloat
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase
      .from('platform_news')
      .delete()
      .lt('created_at', twentyFourHoursAgo);

    if (deleteError) {
      console.error("Error deleting old news:", deleteError);
      // Non-fatal, continue to insert
    }

    // 5. Format and insert new articles
    const newsToInsert = articles.map((article: any) => ({
      headline: article.title,
      source: article.source.name,
      url: article.url,
      // created_at is handled by default
    }));

    const { error: insertError } = await supabase
      .from('platform_news')
      .insert(newsToInsert);

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully synced ${articles.length} news articles` 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error fetching live news:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
