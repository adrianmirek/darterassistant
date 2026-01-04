import { chromium } from '@playwright/test';
import type { SupabaseClient } from '@/db/supabase.client';
import type {
  NakkaTournamentScrapedDTO,
  ImportNakkaTournamentsResponseDTO,
} from '@/types';
import {
  NAKKA_BASE_URL,
  NAKKA_STATUS_CODES,
} from '@/lib/constants/nakka.constants';

interface NakkaApiTournament {
  tdid: string; // tournament ID (e.g., "t_WWGB_9024")
  title: string; // tournament name
  status: number; // status code (40 = completed)
  t_date: number; // Unix timestamp
  createTime?: number; // Creation timestamp (optional)
}

/**
 * Scrapes tournaments from Nakka 01 by keyword using Playwright
 * Fetches all tournaments by paginating through API responses
 * @param keyword - Search keyword (e.g., "agawa")
 * @returns Array of scraped tournament DTOs
 */
export async function scrapeTournamentsByKeyword(
  keyword: string
): Promise<NakkaTournamentScrapedDTO[]> {
  const url = `${NAKKA_BASE_URL}/?keyword=${encodeURIComponent(keyword)}`;

  console.log('Launching browser to scrape:', url);

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    const page = await context.newPage();

    const allApiData: NakkaApiTournament[] = [];
    let currentBatch = 0;
    const batchSize = 30;

    // Intercept all API responses to collect paginated data
    page.on('response', async (response) => {
      const responseUrl = response.url();
      if (
        responseUrl.includes('n01_tournament.php') &&
        responseUrl.includes('cmd=get_list')
      ) {
        try {
          const data = (await response.json()) as NakkaApiTournament[];
          console.log(`Intercepted batch: ${data?.length || 0} tournaments (skip=${currentBatch * batchSize})`);
          if (data && Array.isArray(data)) {
            allApiData.push(...data);
          }
        } catch (error) {
          console.error('Failed to parse API response:', error);
        }
      }
    });

    // Navigate to the page - this will trigger the first API call
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log(`Initial batch loaded: ${allApiData.length} tournaments`);

    // Keep scrolling to trigger more API calls until no new data
    let previousCount = 0;
    let noNewDataCount = 0;
    const maxAttempts = 10; // Prevent infinite loops

    while (noNewDataCount < 3 && currentBatch < maxAttempts) {
      previousCount = allApiData.length;

      // Scroll to bottom to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for potential API call
      await page.waitForTimeout(1500);

      currentBatch++;

      if (allApiData.length === previousCount) {
        noNewDataCount++;
        console.log(`No new data loaded (attempt ${noNewDataCount}/3)`);
      } else {
        noNewDataCount = 0;
        console.log(`Total tournaments after scroll: ${allApiData.length}`);
      }
    }

    if (allApiData.length === 0) {
      console.error('No tournament data intercepted from API');
      return [];
    }

    console.log(`Total tournaments collected: ${allApiData.length}`);

    const tournaments: NakkaTournamentScrapedDTO[] = [];
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    console.log(`Filtering tournaments from ${oneYearAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`);

    for (const item of allApiData) {
      // Parse date from Unix timestamp
      let parsedDate: Date | null = null;
      if (item.t_date && item.t_date > 0) {
        parsedDate = new Date(item.t_date * 1000); // Convert Unix timestamp to milliseconds
        console.log('Parsed date item:', item.title, parsedDate);
      }

      console.log('Item:', item);

      // Filter criteria:
      // 1. Must have valid tdid
      // 2. Must be completed (status=40)
      // 3. Must have valid date in the past
      // 4. Must not be older than 1 year
      if (
        item.tdid &&
        item.status === Number(NAKKA_STATUS_CODES.COMPLETED) &&
        parsedDate &&
        parsedDate < now &&
        parsedDate >= oneYearAgo
      ) {
        const href = `${NAKKA_BASE_URL}/comp.php?id=${item.tdid}`;

        tournaments.push({
          nakka_identifier: item.tdid,
          tournament_name: item.title || 'Unknown Tournament',
          href,
          tournament_date: parsedDate,
          status: 'completed',
        });
      }
    }

    console.log(`Filtered to ${tournaments.length} completed tournaments`);
    return tournaments;
  } finally {
    await browser.close();
  }
}

/**
 * Persists scraped tournaments to database (insert-only, skip existing)
 * @param supabase - Supabase client instance
 * @param tournaments - Array of scraped tournaments
 * @returns Import statistics
 */
export async function importTournaments(
  supabase: SupabaseClient,
  tournaments: NakkaTournamentScrapedDTO[]
): Promise<ImportNakkaTournamentsResponseDTO> {
  const result: ImportNakkaTournamentsResponseDTO = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    total_processed: tournaments.length,
    tournaments: [],
  };

  for (const tournament of tournaments) {
    // Check if exists
    const { data: existing } = await supabase
      .schema('nakka')
      .from('tournaments')
      .select('tournament_id')
      .eq('nakka_identifier', tournament.nakka_identifier)
      .single();

    if (existing) {
      // Tournament already exists - skip it
      result.skipped++;
      result.tournaments.push({
        nakka_identifier: tournament.nakka_identifier,
        tournament_name: tournament.tournament_name,
        tournament_date: tournament.tournament_date.toISOString(),
        action: 'skipped',
      });
    } else {
      // Insert new record
      const { error } = await supabase
        .schema('nakka')
        .from('tournaments')
        .insert({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          href: tournament.href,
          match_import_status: null, // Will be set when match import starts
        });

      if (error) {
        console.error('Failed to insert tournament:', error);
        result.skipped++;
        result.tournaments.push({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          action: 'skipped',
        });
      } else {
        result.inserted++;
        result.tournaments.push({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          action: 'inserted',
        });
      }
    }
  }

  return result;
}

/**
 * Main orchestration function
 * @param supabase - Supabase client instance
 * @param keyword - Search keyword
 * @returns Import statistics
 */
export async function syncTournamentsByKeyword(
  supabase: SupabaseClient,
  keyword: string
): Promise<ImportNakkaTournamentsResponseDTO> {
  // Step 1: Scrape tournaments
  const scraped = await scrapeTournamentsByKeyword(keyword);

  // Step 2: Import to database
  const result = await importTournaments(supabase, scraped);

  return result;
}

