import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  NakkaTournamentScrapedDTO,
  ImportNakkaTournamentsResponseDTO,
  NakkaMatchScrapedDTO,
  ImportMatchesResponseDTO,
  NakkaMatchPlayerResultScrapedDTO,
  ImportPlayerResultsResponseDTO,
} from "@/types";
import { NAKKA_BASE_URL, NAKKA_STATUS_CODES } from "@/lib/constants/nakka.constants";

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
export async function scrapeTournamentsByKeyword(keyword: string): Promise<NakkaTournamentScrapedDTO[]> {
  const url = `${NAKKA_BASE_URL}/?keyword=${encodeURIComponent(keyword)}`;

  console.log("Launching browser to scrape:", url);

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    const page = await context.newPage();

    const allApiData: NakkaApiTournament[] = [];
    //let currentBatch = 0;
    //const batchSize = 30;

    // Intercept all API responses to collect paginated data
    page.on("response", async (response) => {
      const responseUrl = response.url();
      if (responseUrl.includes("n01_tournament.php") && responseUrl.includes("cmd=get_list")) {
        try {
          const data = (await response.json()) as NakkaApiTournament[];
          //console.log(`Intercepted batch: ${data?.length || 0} tournaments (skip=${currentBatch * batchSize})`);
          if (data && Array.isArray(data)) {
            allApiData.push(...data);
          }
        } catch (error) {
          console.error("Failed to parse API response:", error);
        }
      }
    });

    // Navigate to the page - this will trigger the first API call
    // Use 'domcontentloaded' instead of 'networkidle' to avoid timeout issues with persistent connections
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000); // Increased wait for JS to execute

    console.log(`Initial batch loaded: ${allApiData.length} tournaments`);

    // Keep scrolling to trigger more API calls until no new data
    // let previousCount = 0;
    // let noNewDataCount = 0;
    // const maxAttempts = 10; // Prevent infinite loops

    /*
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
    */

    if (allApiData.length === 0) {
      console.error("No tournament data intercepted from API");
      return [];
    }

    console.log(`Total tournaments collected: ${allApiData.length}`);

    const tournaments: NakkaTournamentScrapedDTO[] = [];
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    console.log(
      `Filtering tournaments from ${oneYearAgo.toISOString().split("T")[0]} to ${now.toISOString().split("T")[0]}`
    );

    for (const item of allApiData) {
      // Parse date from Unix timestamp
      let parsedDate: Date | null = null;
      if (item.t_date && item.t_date > 0) {
        parsedDate = new Date(item.t_date * 1000); // Convert Unix timestamp to milliseconds
        console.log("Parsed date item:", item.title, parsedDate);
      }

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
          tournament_name: item.title || "Unknown Tournament",
          href,
          tournament_date: parsedDate,
          status: "completed",
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
      .schema("nakka")
      .from("tournaments")
      .select("tournament_id")
      .eq("nakka_identifier", tournament.nakka_identifier)
      .single();

    if (existing) {
      // Tournament already exists - skip it
      result.skipped++;
      result.tournaments.push({
        nakka_identifier: tournament.nakka_identifier,
        tournament_name: tournament.tournament_name,
        tournament_date: tournament.tournament_date.toISOString(),
        action: "skipped",
      });
    } else {
      // Insert new record
      const { error } = await supabase.schema("nakka").from("tournaments").insert({
        nakka_identifier: tournament.nakka_identifier,
        tournament_name: tournament.tournament_name,
        tournament_date: tournament.tournament_date.toISOString(),
        href: tournament.href,
        match_import_status: null, // Will be set when match import starts
      });

      if (error) {
        console.error("Failed to insert tournament:", error);
        result.skipped++;
        result.tournaments.push({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          action: "skipped",
        });
      } else {
        result.inserted++;
        result.tournaments.push({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          action: "inserted",
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

  // const result: ImportNakkaTournamentsResponseDTO = {
  //   inserted: 1,
  //   updated: 0,
  //   skipped: 0,
  //   total_processed: 1,
  //   tournaments: [{
  //     nakka_identifier: 't_0dfH_3607',
  //     tournament_name: 'Turniej Świąteczny Agawa 20.12.2025',
  //     tournament_date: '2025-12-20T19:00:00.000Z',
  //     action: 'inserted'
  //   }],
  // };

  // Step 3: For each tournament, scrape matches if needed (new or incomplete)
  const matchStats: Record<string, ImportMatchesResponseDTO> = {};

  console.log(`Processing matches for ${result.tournaments.length} tournaments...`);

  for (const tournament of result.tournaments) {
    try {
      console.log(`Checking match status for tournament: ${tournament.nakka_identifier}`);

      // Get tournament_id and match_import_status from database
      const { data: dbTournament, error: fetchError } = await supabase
        .schema("nakka")
        .from("tournaments")
        .select("tournament_id, href, match_import_status")
        .eq("nakka_identifier", tournament.nakka_identifier)
        .single();

      if (fetchError || !dbTournament) {
        console.error(`Failed to fetch tournament ${tournament.nakka_identifier}:`, fetchError);
        continue;
      }

      // Skip if match import is already completed
      if (dbTournament.match_import_status === "completed") {
        console.log(`Skipping ${tournament.nakka_identifier}: matches already imported`);
        continue;
      }

      console.log(
        `Processing tournament: ${tournament.nakka_identifier} (status: ${dbTournament.match_import_status || "null"})`
      );

      // Check if matches already exist for this tournament
      const { data: existingMatches, error: matchCheckError } = await supabase
        .schema("nakka")
        .from("tournament_matches" as unknown as "tournament_matches")
        .select("tournament_match_id, nakka_match_identifier, href, match_result_status")
        .eq("tournament_id", dbTournament.tournament_id);

      if (matchCheckError) {
        console.error(`Failed to check existing matches for ${tournament.nakka_identifier}:`, matchCheckError);
        continue;
      }

      interface TournamentMatchWithStatus {
        tournament_match_id: number;
        nakka_match_identifier: string;
        href: string;
        match_result_status: "in_progress" | "completed" | "failed" | null;
      }

      const matches = (existingMatches || []) as unknown as TournamentMatchWithStatus[];

      // If no matches exist, scrape them from Nakka first
      if (matches.length === 0) {
        console.log(`No matches found in database for ${tournament.nakka_identifier}, scraping from Nakka...`);

        // Update status to in_progress
        await supabase
          .schema("nakka")
          .from("tournaments")
          .update({ match_import_status: "in_progress" })
          .eq("tournament_id", dbTournament.tournament_id);

        // Scrape matches
        const scrapedMatches = await scrapeTournamentMatches(dbTournament.href);
        const matchResult = await importMatches(supabase, dbTournament.tournament_id, scrapedMatches);

        matchStats[tournament.nakka_identifier] = matchResult;

        // Check if match scraping/import failed completely
        if (
          matchResult.failed > 0 ||
          matchResult.total_processed === 0 ||
          (matchResult.inserted === 0 && matchResult.skipped === 0)
        ) {
          const errorMessage = matchResult.errors?.length
            ? JSON.stringify(matchResult.errors)
            : "Failed to scrape or import matches";

          await supabase
            .schema("nakka")
            .from("tournaments")
            .update({
              match_import_status: "failed",
              match_import_error: errorMessage,
            })
            .eq("tournament_id", dbTournament.tournament_id);

          console.log(`Match import failed for ${tournament.nakka_identifier}: ${errorMessage}`);
          continue; // Skip to next tournament
        }

        console.log(
          `Scraped ${matchResult.total_processed} matches for ${tournament.nakka_identifier} (inserted: ${matchResult.inserted}, skipped: ${matchResult.skipped})`
        );

        // Fetch the newly inserted matches
        const { data: newMatches, error: newMatchError } = await supabase
          .schema("nakka")
          .from("tournament_matches" as unknown as "tournament_matches")
          .select("tournament_match_id, nakka_match_identifier, href, match_result_status")
          .eq("tournament_id", dbTournament.tournament_id);

        if (newMatchError || !newMatches) {
          console.error(`Failed to fetch newly inserted matches:`, newMatchError);
          continue;
        }

        matches.length = 0;
        matches.push(...(newMatches as unknown as TournamentMatchWithStatus[]));
      }

      // Step 4: Process player results for uncompleted matches only
      // Filter out completed matches
      const uncompletedMatches = matches.filter((m) => m.match_result_status !== "completed");

      if (uncompletedMatches.length === 0) {
        console.log(`All ${matches.length} matches already completed for ${tournament.nakka_identifier}`);
        // Track that we checked this tournament but everything was already done
        matchStats[tournament.nakka_identifier] = {
          total_processed: 0,
          inserted: 0,
          skipped: matches.length,
          failed: 0,
        };
        continue;
      }

      console.log(
        `Processing player results for ${uncompletedMatches.length} uncompleted matches (${matches.length - uncompletedMatches.length} already completed)...`
      );

      try {
        let anyMatchFailed = false;
        let allMatchesCompleted = true;

        for (const match of uncompletedMatches) {
          try {
            console.log(`Processing player results for match: ${match.nakka_match_identifier}`);

            // Update match status to in_progress
            await supabase
              .schema("nakka")
              .from("tournament_matches" as unknown as "tournament_matches")
              .update({ match_result_status: "in_progress" })
              .eq("tournament_match_id", match.tournament_match_id);

            // Scrape player results
            const playerResults = await scrapeMatchPlayerResults(match.href, match.nakka_match_identifier);

            // Import player results
            const playerResultsImport = await importMatchPlayerResults(
              supabase,
              match.tournament_match_id,
              playerResults
            );

            // Check if import was successful
            if (playerResultsImport.failed > 0 || playerResultsImport.inserted === 0) {
              anyMatchFailed = true;
              allMatchesCompleted = false;

              await supabase
                .schema("nakka")
                .from("tournament_matches" as unknown as "tournament_matches")
                .update({
                  match_result_status: "failed",
                  match_result_error: playerResultsImport.errors?.length
                    ? JSON.stringify(playerResultsImport.errors)
                    : "Failed to import player results",
                })
                .eq("tournament_match_id", match.tournament_match_id);

              console.log(`Player results import failed for match ${match.nakka_match_identifier}`);
            } else {
              // Success
              await supabase
                .schema("nakka")
                .from("tournament_matches" as unknown as "tournament_matches")
                .update({
                  match_result_status: "completed",
                  match_result_error: null,
                })
                .eq("tournament_match_id", match.tournament_match_id);

              console.log(`Player results import completed for match ${match.nakka_match_identifier}`);
            }
          } catch (matchError) {
            anyMatchFailed = true;
            allMatchesCompleted = false;

            console.error(`Failed to process player results for match ${match.nakka_match_identifier}:`, matchError);

            await supabase
              .schema("nakka")
              .from("tournament_matches" as unknown as "tournament_matches")
              .update({
                match_result_status: "failed",
                match_result_error: matchError instanceof Error ? matchError.message : "Unknown error",
              })
              .eq("tournament_match_id", match.tournament_match_id);
          }
        }

        // Tournament status will be auto-updated by trigger based on match statuses
        // No need to manually update tournament status here
        if (anyMatchFailed) {
          console.log(`Some matches failed during player results import for ${tournament.nakka_identifier}`);
        } else if (allMatchesCompleted) {
          console.log(`All player results processed for ${tournament.nakka_identifier}`);
        }
      } catch (playerResultsError) {
        console.error(
          `Failed to process player results for tournament ${tournament.nakka_identifier}:`,
          playerResultsError
        );
        // Individual match failures are already tracked in match_result_status
        // Tournament status will be auto-calculated by trigger based on match statuses
      }
    } catch (error) {
      console.error(`Failed to import matches for ${tournament.nakka_identifier}:`, error);

      // Try to update status to failed
      try {
        const { data: dbTournament } = await supabase
          .schema("nakka")
          .from("tournaments")
          .select("tournament_id")
          .eq("nakka_identifier", tournament.nakka_identifier)
          .single();

        if (dbTournament) {
          await supabase
            .schema("nakka")
            .from("tournaments")
            .update({
              match_import_status: "failed",
              match_import_error: error instanceof Error ? error.message : "Unknown error",
            })
            .eq("tournament_id", dbTournament.tournament_id);
        }
      } catch (updateError) {
        console.error("Failed to update tournament status:", updateError);
      }
    }
  }

  return {
    ...result,
    match_stats: matchStats,
  };
}

/**
 * Parses match type from subtitle and base type
 * @param subtitle - Subtitle attribute from match element (e.g., "Top 16", "Group 1")
 * @param baseType - Base type from ttype attribute ("rr" or "t")
 * @returns Formatted match type string
 */
function parseMatchType(subtitle: string | null, baseType: string): string {
  if (baseType === "rr") return "rr";

  // For knockout matches, convert "Top 16" to "t_top_16"
  if (!subtitle) return "t_unknown";

  return `t_${subtitle.toLowerCase().replace(/\s+/g, "_")}`;
}

/**
 * Extracts player names from the page for a given match
 * @param page - Playwright page instance
 * @param tpid - First player code
 * @param vstpid - Second player code
 * @returns Object with first and second player names
 */
async function extractPlayerNamesForMatch(
  page: Page,
  tpid: string,
  vstpid: string
): Promise<{ first: string; second: string }> {
  // Look for player names in the round-robin table or tournament structure
  const firstPlayerElement = await page.$(`[tpid="${tpid}"] .entry_name`);
  const secondPlayerElement = await page.$(`[tpid="${vstpid}"] .entry_name`);

  const first = firstPlayerElement ? (await firstPlayerElement.textContent())?.trim() || "Unknown" : "Unknown";
  const second = secondPlayerElement ? (await secondPlayerElement.textContent())?.trim() || "Unknown" : "Unknown";

  return { first, second };
}

/**
 * Extracts opponent name from the page by player code
 * @param page - Playwright page instance
 * @param vstpid - Opponent player code
 * @returns Opponent name or 'Unknown'
 */
async function extractOpponentName(page: Page, vstpid: string): Promise<string> {
  const element = await page.$(`[tpid="${vstpid}"] .entry_name`);
  return element ? (await element.textContent())?.trim() || "Unknown" : "Unknown";
}

/**
 * Scrapes group stage (round-robin) matches from tournament page
 * @param page - Playwright page instance
 * @param tournamentId - Tournament identifier (e.g., "t_Nd6M_9511")
 * @returns Array of scraped match DTOs
 */
async function scrapeGroupMatches(page: Page, tournamentId: string): Promise<NakkaMatchScrapedDTO[]> {
  const matches: NakkaMatchScrapedDTO[] = [];
  const seenIdentifiers = new Set<string>();

  // Find rr_container
  const rrContainer = await page.$("#rr_container");
  if (!rrContainer) {
    console.log("No #rr_container found - skipping group matches");
    return matches;
  }
  // Find all rr_result elements
  const results = await page.$$(".rr_result.view_button");
  console.log(`Found ${results.length} potential group match elements`);

  // Debug: log the first element's HTML to understand structure
  if (results.length > 0) {
    const firstElementHtml = await results[0].evaluate((el) => el.outerHTML);
    console.log("Sample group match element:", firstElementHtml.substring(0, 500));
  }

  for (const result of results) {
    try {
      const ttype = await result.getAttribute("ttype");
      if (ttype !== "rr") continue;

      const subtitle = await result.getAttribute("subtitle");
      const round = (await result.getAttribute("round")) || "0";
      const tpid = await result.getAttribute("tpid"); // First player code
      const vstpid = await result.getAttribute("vstpid"); // Second player code

      if (!tpid || !vstpid) {
        console.log(`Missing required attributes: tpid=${tpid}, vstpid=${vstpid}`);
        continue;
      }

      // Skip matches without average score (incomplete/invalid matches)
      // Check if the match element contains a .r_avg span (indicates completed match with stats)
      const hasAverage = await result.$(".r_avg");
      if (!hasAverage) {
        console.log(`Skipping match without average score: ${tpid} vs ${vstpid}`);
        continue;
      }

      // Normalize player codes: always put them in alphabetical order for consistent identifier
      const [firstCode, secondCode] = [tpid, vstpid].sort();

      // Construct match identifier and URL (using normalized order)
      const identifier = `${tournamentId}_rr_${round}_${firstCode}_${secondCode}`;

      // if (identifier !== 't_0dfH_3607_rr_4_Wigo_aVPA' && identifier !== 't_0dfH_3607_rr_10_C2aF_CmuS') {
      //   continue;
      // }

      // Debug: log all attributes for these two matches
      // const allAttrs = await result.evaluate(el => {
      //   const attrs: Record<string, string> = {};
      //   for (let i = 0; i < el.attributes.length; i++) {
      //     const attr = el.attributes[i];
      //     attrs[attr.name] = attr.value;
      //   }
      //   return attrs;
      // });
      // console.log(`Match ${identifier} attributes:`, allAttrs);

      const href = `${NAKKA_BASE_URL}/n01_view.html?tmid=${identifier}`;

      // Skip duplicates (group matches appear twice in table with players reversed)
      if (seenIdentifiers.has(identifier)) {
        console.log(`Skipping duplicate match: ${identifier}`);
        continue;
      }
      seenIdentifiers.add(identifier);

      // Extract player names (in original order for display)
      const playerNames = await extractPlayerNamesForMatch(page, tpid, vstpid);

      matches.push({
        nakka_match_identifier: identifier,
        match_type: parseMatchType(subtitle, "rr"),
        first_player_name: playerNames.first,
        first_player_code: firstCode,
        second_player_name: playerNames.second,
        second_player_code: secondCode,
        href,
      });

      console.log(`Scraped group match: ${identifier} (${playerNames.first} vs ${playerNames.second})`);
    } catch (error) {
      console.error("Error scraping group match:", error);
      // Continue with next match
    }
  }

  console.log(`Total group matches scraped: ${matches.length}`);
  return matches;
}

/**
 * Scrapes knockout stage matches from tournament page
 * @param page - Playwright page instance
 * @param tournamentId - Tournament identifier (e.g., "t_Nd6M_9511")
 * @returns Array of scraped match DTOs
 */
async function scrapeKnockoutMatches(page: Page, tournamentId: string): Promise<NakkaMatchScrapedDTO[]> {
  const matches: NakkaMatchScrapedDTO[] = [];
  const seenIdentifiers = new Set<string>();

  const bracketContainer = await page.$("#bracket_container");
  if (!bracketContainer) {
    console.log("No #bracket_container found - skipping knockout matches");
    return matches;
  }
  // Find all t_item elements with view_button class
  const items = await page.$$('.t_item.view_button[ttype="t"]');
  console.log(`Found ${items.length} potential knockout match elements`);

  // Debug: log the first element's HTML to understand structure
  if (items.length > 0) {
    const firstElementHtml = await items[0].evaluate((el) => el.outerHTML);
    console.log("Sample knockout match element:", firstElementHtml.substring(0, 500));
  }

  for (const item of items) {
    try {
      const ttype = await item.getAttribute("ttype");
      if (ttype !== "t") continue;

      const subtitle = await item.getAttribute("subtitle"); // e.g., "Top 16"
      const round = (await item.getAttribute("round")) || "0";
      const tpid = await item.getAttribute("tpid");
      const vstpid = await item.getAttribute("vstpid");

      if (!tpid || !vstpid) {
        console.log(`Missing required attributes (knockout): tpid=${tpid}, vstpid=${vstpid}`);
        continue;
      }

      // Normalize player codes: always put them in alphabetical order for consistent identifier
      const [firstCode, secondCode] = [tpid, vstpid].sort();

      // Construct match identifier and URL (using normalized order)
      const identifier = `${tournamentId}_t_${round}_${firstCode}_${secondCode}`;
      const href = `${NAKKA_BASE_URL}/n01_view.html?tmid=${identifier}`;

      // Skip duplicates
      if (seenIdentifiers.has(identifier)) {
        console.log(`Skipping duplicate knockout match: ${identifier}`);
        continue;
      }
      seenIdentifiers.add(identifier);

      // Extract player names from nested elements
      const playerName = await item
        .$eval(".entry_name", (el) => el.textContent?.trim() || "Unknown")
        .catch(() => "Unknown");
      const opponentName = await extractOpponentName(page, vstpid);

      matches.push({
        nakka_match_identifier: identifier,
        match_type: parseMatchType(subtitle, "t"),
        first_player_name: playerName,
        first_player_code: firstCode,
        second_player_name: opponentName,
        second_player_code: secondCode,
        href,
      });

      console.log(`Scraped knockout match: ${identifier} (${playerName} vs ${opponentName})`);
    } catch (error) {
      console.error("Error scraping knockout match:", error);
      // Continue with next match
    }
  }

  console.log(`Total knockout matches scraped: ${matches.length}`);
  return matches;
}

/**
 * Main orchestration function for scraping tournament matches
 * @param tournamentHref - Full URL to tournament page
 * @returns Array of scraped match DTOs
 */
export async function scrapeTournamentMatches(tournamentHref: string): Promise<NakkaMatchScrapedDTO[]> {
  console.log("Launching browser to scrape matches from:", tournamentHref);

  // Extract tournament ID from URL (e.g., "comp.php?id=t_Nd6M_9511" -> "t_Nd6M_9511")
  const tournamentIdMatch = tournamentHref.match(/[?&]id=([^&]+)/);
  if (!tournamentIdMatch) {
    throw new Error(`Could not extract tournament ID from URL: ${tournamentHref}`);
  }
  const tournamentId = tournamentIdMatch[1];
  console.log("Tournament ID:", tournamentId);

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    const page = await context.newPage();

    // Use 'domcontentloaded' instead of 'networkidle' to avoid timeout issues with persistent connections
    await page.goto(tournamentHref, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000); // Increased wait for JS to execute

    console.log("Page loaded, scraping matches...");

    // Scrape both stages in parallel

    const [groupMatches, knockoutMatches] = await Promise.all([
      scrapeGroupMatches(page, tournamentId),
      scrapeKnockoutMatches(page, tournamentId),
    ]);

    const allMatches = [...groupMatches, ...knockoutMatches];
    console.log(
      `Total matches scraped: ${allMatches.length} (${groupMatches.length} group + ${knockoutMatches.length} knockout)`
    );

    // const [knockoutMatches] = await Promise.all([
    //   scrapeKnockoutMatches(page, tournamentId)
    // ]);

    // const allMatches = [...knockoutMatches];
    // console.log(`Total matches scraped: ${allMatches.length} (${knockoutMatches.length} group matches)`);

    return allMatches;
  } finally {
    await browser.close();
  }
}

/**
 * Imports matches to database (skip existing based on unique constraint)
 * @param supabase - Supabase client instance
 * @param tournamentId - Tournament ID from database
 * @param matches - Array of scraped match DTOs
 * @returns Import statistics
 */
export async function importMatches(
  supabase: SupabaseClient,
  tournamentId: number,
  matches: NakkaMatchScrapedDTO[]
): Promise<ImportMatchesResponseDTO> {
  const result: ImportMatchesResponseDTO = {
    inserted: 0,
    skipped: 0,
    failed: 0,
    total_processed: matches.length,
    errors: [],
  };

  console.log(`Importing ${matches.length} matches for tournament ${tournamentId}...`);

  for (const match of matches) {
    try {
      const { error } = await supabase
        .schema("nakka")
        .from("tournament_matches" as unknown as "tournament_matches")
        .insert({
          tournament_id: tournamentId,
          nakka_match_identifier: match.nakka_match_identifier,
          match_type: match.match_type,
          first_player_name: match.first_player_name,
          first_player_code: match.first_player_code,
          second_player_name: match.second_player_name,
          second_player_code: match.second_player_code,
          href: match.href,
        });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation - skip
          result.skipped++;
          console.log(`Skipped duplicate match: ${match.nakka_match_identifier}`);
        } else {
          result.failed++;
          result.errors?.push({
            identifier: match.nakka_match_identifier,
            error: error.message,
          });
          console.error(`Failed to insert match ${match.nakka_match_identifier}:`, error.message);
        }
      } else {
        result.inserted++;
        console.log(`Inserted match: ${match.nakka_match_identifier}`);
      }
    } catch (error) {
      result.failed++;
      result.errors?.push({
        identifier: match.nakka_match_identifier,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error(`Exception inserting match ${match.nakka_match_identifier}:`, error);
    }
  }

  console.log(`Match import complete: ${result.inserted} inserted, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}

/**
 * Helper function to safely parse numeric value from HTML element
 * @param text - Text content from HTML element
 * @returns Parsed number or null if invalid
 */
function parseNumericValue(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/,/g, ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Helper function to safely parse integer value from HTML element
 * @param text - Text content from HTML element
 * @returns Parsed integer or 0 if invalid
 */
function parseIntValue(text: string | null | undefined): number {
  if (!text) return 0;
  const cleaned = text.trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extracts match identifier components for constructing player identifiers
 * @param nakkaMatchIdentifier - Full match identifier (e.g., "t_ydhN_9630_t_1_KDCX_j3vh")
 * @returns Components needed to construct player identifiers
 */
function extractMatchIdentifierComponents(nakkaMatchIdentifier: string): {
  tournamentId: string;
  matchType: string;
  round: string;
  firstPlayerCode: string;
  secondPlayerCode: string;
} | null {
  // Pattern: tournamentId_matchType_round_player1_player2
  // Examples:
  // - "t_ydhN_9630_t_1_KDCX_j3vh" -> t_ydhN_9630, t, 1, KDCX, j3vh
  // - "t_Nd6M_9511_rr_2_3Tm2_Az9g" -> t_Nd6M_9511, rr, 2, 3Tm2, Az9g

  const parts = nakkaMatchIdentifier.split("_");

  if (parts.length < 5) {
    console.error(`Invalid match identifier format: ${nakkaMatchIdentifier}`);
    return null;
  }

  // Tournament ID is first 3 parts (e.g., "t_ydhN_9630")
  const tournamentId = parts.slice(0, 3).join("_");

  // Match type is 4th part
  const matchType = parts[3];

  // Round is 5th part
  const round = parts[4];

  // Player codes are last 2 parts
  const firstPlayerCode = parts[parts.length - 2];
  const secondPlayerCode = parts[parts.length - 1];

  return {
    tournamentId,
    matchType,
    round,
    firstPlayerCode,
    secondPlayerCode,
  };
}

/**
 * Scrapes player-level statistics from a match page with retry logic
 * @param matchHref - Full URL to match page
 * @param nakkaMatchIdentifier - Match identifier for constructing player identifiers
 * @param retryCount - Current retry attempt (used internally)
 * @param maxRetries - Maximum number of retry attempts
 * @returns Array of player results (2 items, one per player)
 */
export async function scrapeMatchPlayerResults(
  matchHref: string,
  nakkaMatchIdentifier: string,
  retryCount = 0,
  maxRetries = 3
): Promise<NakkaMatchPlayerResultScrapedDTO[]> {
  console.log(`Scraping player results from: ${matchHref} (attempt ${retryCount + 1}/${maxRetries + 1})`);

  // Extract components from match identifier
  const components = extractMatchIdentifierComponents(nakkaMatchIdentifier);
  if (!components) {
    throw new Error(`Failed to parse match identifier: ${nakkaMatchIdentifier}`);
  }

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    const page = await context.newPage();

    // Use 'domcontentloaded' instead of 'networkidle' to avoid timeout issues with persistent connections
    // Increased timeout to 60 seconds for better resilience
    await page.goto(matchHref, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Wait for JavaScript to render the statistics
    console.log("Waiting for page content to fully render...");
    await page.waitForTimeout(3000); // Wait for JS to execute

    // Wait for any article element to be present
    try {
      await page.waitForSelector("article", { timeout: 10000 });
    } catch {
      console.error("No article element found, checking page structure...");
      const bodyHTML = await page.content();
      console.log("Page HTML (first 2000 chars):", bodyHTML.substring(0, 2000));
      throw new Error("Article element not found on page");
    }

    try {
      await page.waitForSelector("#menu_stats", { timeout: 5000 });
      await page.click("#menu_stats", { force: true });

      // Wait for the stats iframe to appear
      await page.waitForSelector("#stats_frame", { timeout: 5000 });

      // Get the iframe and wait for it to load
      const statsFrame = page.frameLocator("#stats_frame");

      // Wait for the stats table inside the iframe to be populated
      await statsFrame.locator(".stats_table").waitFor({ timeout: 5000 });

      // Wait for stats to be populated inside iframe
      await page.waitForFunction(
        () => {
          const iframe = document.querySelector("#stats_frame") as HTMLIFrameElement;
          if (!iframe || !iframe.contentDocument) return false;
          const p1Legs = iframe.contentDocument.querySelector("#p1_legs");
          return p1Legs && p1Legs.textContent && p1Legs.textContent.trim() !== "";
        },
        { timeout: 5000 }
      );
    } catch (e) {
      console.error("Failed to load stats iframe:", e);
      throw new Error("Could not load statistics iframe - stats button not clickable or iframe did not load");
    }

    console.log("Page loaded, extracting player statistics from iframe...");

    // Get player names - just select .name_text directly (these are in the iframe)
    const playerNames = await page.evaluate(() => {
      const iframe = document.querySelector("#stats_frame") as HTMLIFrameElement;
      if (!iframe || !iframe.contentDocument) return [];
      const nameTexts = iframe.contentDocument.querySelectorAll(".name_text");
      return Array.from(nameTexts).map((el) => el.textContent?.trim() || "");
    });

    if (playerNames.length !== 2) {
      throw new Error(`Expected 2 player names, found ${playerNames.length}: ${JSON.stringify(playerNames)}`);
    }

    // Get statistics from stats_table using specific row classes and IDs - INSIDE THE IFRAME
    const stats = await page.evaluate(() => {
      const iframe = document.querySelector("#stats_frame") as HTMLIFrameElement;
      if (!iframe || !iframe.contentDocument) return {};

      const doc = iframe.contentDocument;
      const getValue = (selector: string): string => {
        const el = doc.querySelector(selector);
        return el?.textContent?.trim() || "";
      };

      return {
        // Player 1 stats (left column)
        p1_legs: getValue("#p1_legs"),
        p1_score: getValue("#p1_score"),
        p1_first9: getValue("#p1_first9"),
        p1_60: getValue("#p1_60"),
        p1_80: getValue("#p1_80"),
        p1_ton00: getValue("#p1_ton00"),
        p1_ton20: getValue("#p1_ton20"),
        p1_ton40: getValue("#p1_ton40"),
        p1_ton70: getValue("#p1_ton70"),
        p1_ton80: getValue("#p1_ton80"),
        p1_highout: getValue("#p1_highout"),
        p1_best: getValue("#p1_best"),
        p1_worst: getValue("#p1_worst"),
        p1_checkout: getValue(".detail.checkout .left"),

        // Player 2 stats (right column)
        p2_legs: getValue("#p2_legs"),
        p2_score: getValue("#p2_score"),
        p2_first9: getValue("#p2_first9"),
        p2_60: getValue("#p2_60"),
        p2_80: getValue("#p2_80"),
        p2_ton00: getValue("#p2_ton00"),
        p2_ton20: getValue("#p2_ton20"),
        p2_ton40: getValue("#p2_ton40"),
        p2_ton70: getValue("#p2_ton70"),
        p2_ton80: getValue("#p2_ton80"),
        p2_highout: getValue("#p2_highout"),
        p2_best: getValue("#p2_best"),
        p2_worst: getValue("#p2_worst"),
        p2_checkout: getValue(".detail.checkout .right"),
      };
    });
    const results: NakkaMatchPlayerResultScrapedDTO[] = [];

    // Helper function to parse checkout percentage from format "15.0%<br>(3 / 20)"
    const parseCheckout = (text: string): number | null => {
      if (!text) return null;
      const match = text.match(/^([\d.]+)%/);
      if (!match) return null;
      const parsed = parseFloat(match[1]);
      return isNaN(parsed) ? null : parsed;
    };

    // Process both players (0 = first player, 1 = second player)
    for (let playerIndex = 0; playerIndex < 2; playerIndex++) {
      const playerCode = playerIndex === 0 ? components.firstPlayerCode : components.secondPlayerCode;
      const nakkaMatchPlayerIdentifier = `${components.tournamentId}_${components.matchType}_${components.round}_${playerCode}`;

      console.log(`Processing player ${playerIndex + 1}: ${nakkaMatchPlayerIdentifier}`);

      // Extract stats for the current player
      const prefix = playerIndex === 0 ? "p1_" : "p2_";
      const opponentPrefix = playerIndex === 0 ? "p2_" : "p1_";

      const playerScore = parseIntValue(stats[`${prefix}legs`]);
      const opponentScore = parseIntValue(stats[`${opponentPrefix}legs`]);

      // Calculate score_60_count as sum of 60+ and 80+
      const score60 = parseIntValue(stats[`${prefix}60`]);
      const score80 = parseIntValue(stats[`${prefix}80`]);
      const score_60_count = score60 + score80;

      // Calculate score_100_count as sum of 100+ and 120+
      const ton00 = parseIntValue(stats[`${prefix}ton00`]);
      const ton20 = parseIntValue(stats[`${prefix}ton20`]);
      const score_100_count = ton00 + ton20;

      // Calculate score_140_count as sum of 140+ and 170+
      const ton40 = parseIntValue(stats[`${prefix}ton40`]);
      const ton70 = parseIntValue(stats[`${prefix}ton70`]);
      const score_140_count = ton40 + ton70;

      results.push({
        nakka_match_player_identifier: nakkaMatchPlayerIdentifier,
        average_score: parseNumericValue(stats[`${prefix}score`]),
        first_nine_avg: parseNumericValue(stats[`${prefix}first9`]),
        checkout_percentage: parseCheckout(stats[`${prefix}checkout`] || ""),
        score_60_count,
        score_100_count,
        score_140_count,
        score_180_count: parseIntValue(stats[`${prefix}ton80`]),
        high_finish: parseIntValue(stats[`${prefix}highout`]),
        best_leg: parseIntValue(stats[`${prefix}best`]),
        worst_leg: parseIntValue(stats[`${prefix}worst`]),
        player_score: playerScore,
        opponent_score: opponentScore,
      });

      console.log(`Player ${playerIndex + 1} stats:`, results[playerIndex]);
    }

    console.log(`Successfully scraped results for ${results.length} players`);
    return results;
  } catch (error) {
    await browser.close(); // Close browser before retry

    // Check if this is a timeout error and we have retries left
    const isTimeoutError =
      error instanceof Error && (error.message.includes("Timeout") || error.message.includes("timeout"));

    if (isTimeoutError && retryCount < maxRetries) {
      const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.warn(`Timeout error, retrying in ${delayMs}ms... (attempt ${retryCount + 1}/${maxRetries})`);

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Retry with incremented count
      return scrapeMatchPlayerResults(matchHref, nakkaMatchIdentifier, retryCount + 1, maxRetries);
    }

    console.error("Error scraping match player results:", error);
    throw error;
  } finally {
    // Browser is already closed in catch block if retrying, so check if it's still running
    if (browser.isConnected()) {
      await browser.close();
    }
  }
}

/**
 * Imports player results to database (upsert: insert if not exists, update if exists)
 * @param supabase - Supabase client instance
 * @param tournamentMatchId - Tournament match ID from database
 * @param playerResults - Array of scraped player results (should be 2 items)
 * @returns Import statistics
 */
export async function importMatchPlayerResults(
  supabase: SupabaseClient,
  tournamentMatchId: number,
  playerResults: NakkaMatchPlayerResultScrapedDTO[]
): Promise<ImportPlayerResultsResponseDTO> {
  const result: ImportPlayerResultsResponseDTO = {
    inserted: 0,
    skipped: 0,
    failed: 0,
    total_processed: playerResults.length,
    errors: [],
  };

  console.log(`Importing ${playerResults.length} player results for match ${tournamentMatchId}...`);

  for (const playerResult of playerResults) {
    try {
      // Use upsert to insert or update based on unique constraint
      const { error } = await supabase
        .schema("nakka")
        .from("tournament_match_player_results" as unknown as "tournament_match_player_results")
        .upsert(
          {
            tournament_match_id: tournamentMatchId,
            nakka_match_player_identifier: playerResult.nakka_match_player_identifier,
            average_score: playerResult.average_score,
            first_nine_avg: playerResult.first_nine_avg,
            checkout_percentage: playerResult.checkout_percentage,
            score_60_count: playerResult.score_60_count,
            score_100_count: playerResult.score_100_count,
            score_140_count: playerResult.score_140_count,
            score_180_count: playerResult.score_180_count,
            high_finish: playerResult.high_finish,
            best_leg: playerResult.best_leg,
            worst_leg: playerResult.worst_leg,
            player_score: playerResult.player_score,
            opponent_score: playerResult.opponent_score,
          },
          {
            onConflict: "tournament_match_id,nakka_match_player_identifier",
          }
        );

      if (error) {
        result.failed++;
        result.errors?.push({
          identifier: playerResult.nakka_match_player_identifier,
          error: error.message,
        });
        console.error(`Failed to upsert player result ${playerResult.nakka_match_player_identifier}:`, error.message);
      } else {
        result.inserted++;
        console.log(`Upserted player result: ${playerResult.nakka_match_player_identifier}`);
      }
    } catch (error) {
      result.failed++;
      result.errors?.push({
        identifier: playerResult.nakka_match_player_identifier,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error(`Exception upserting player result ${playerResult.nakka_match_player_identifier}:`, error);
    }
  }

  console.log(
    `Player results import complete: ${result.inserted} inserted, ${result.skipped} skipped, ${result.failed} failed`
  );
  return result;
}
