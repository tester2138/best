# BestForex.io News Article Audit — 2026-09-21

**Scope:** 286 static news articles, including live and scheduled articles.
**Audit clock:** 2026-09-21T14:35:00.000Z.
**Route base:** http://localhost:3000.
**Publication/share scope:** Post model exposes publication scheduling, but no share-state field; “published/shared or not” is therefore represented here by live versus scheduled status.

## Executive result

- Live by publication date: **243**
- Scheduled/future: **43**
- Duplicate slugs: **0**
- Duplicate IDs: **0**
- Route faults: **0**
- Image faults: **0**
- Missing required fields: **0**
- Invalid publication dates: **0**
- Live articles missing from paginated 'news': **0**
- Future articles incorrectly linked from paginated 'news': **0**
- Current news-sitemap entries: **10**
- Current RSS feed items: **50**
- Google News discovery-signal faults: **0**

No article route, featured-image, or archive-discovery failure was found in this static pass. Articles listed below need editorial/SEO review, not automatic deletion.

## Implemented Google News remediations

- Article HTML titles, visible H1s, Open Graph/Twitter titles, and NewsArticle headlines now use the same published headline.
- Article pages show a clear UTC publication date and time in a crawlable <time> element.
- Opinion and analysis posts use the standard NewsArticle type with a matching genre field and visible editorial label; straight reporting remains NewsArticle.
- Article schema now includes linked author identity, publisher identity/logo, publication/modification dates, language, free-access status, image, and canonical main entity.
- The News sitemap publication name now matches BestForex.io, stays limited to recent articles, and remains linked from robots.txt.
- RSS autodiscovery remains available for feed readers, while publication writes invalidate the News pages, feed and sitemaps and notify WebSub.
- Author pages expose ProfilePage markup, and category cards use valid non-nested crawlable links.
- The paginated news archive has deterministic sorting and canonical normalization for out-of-range page parameters.
- Legacy source attribution was added where the article already documented its source note, and headlines exceeding Google's 110-character guidance were shortened without changing their meaning.

## Blocking faults

### Article routes

- None

### Featured images

- None

### Required data, dates, and uniqueness

- Missing required fields: - None
- Invalid publication dates: - None
- Duplicate slugs: - None
- Duplicate IDs: - None

### Google News discovery signals

Live articles missing from the paginated 'news' archive (0):

- None

Future articles linked before publication (0):

- None

News sitemap checks (0):

- None

## SEO review queue

### Content length

Measured article body under 500 words (79):

- `blue-guardian-review-rating-2026 (497 words)`
- `teletrade-withdrawal-delay-complaints-2026 (498 words)`
- `aquafunded-payout-drawdown-complaints-2026 (486 words)`
- `jfd-brokers-cysec-complaints-gbe-transfer-2026 (479 words)`
- `falcon-funded-payout-complaints-2026 (477 words)`
- `scope-markets-withdrawal-complaints-2026 (460 words)`
- `tx3-funding-toptier-trader-complaints-2026 (447 words)`
- `elite-trader-funding-payout-complaints-2026 (414 words)`
- `brightfunded-kyc-slippage-complaints-2026 (423 words)`
- `funded-nation-payout-complaints-unpaid (466 words)`
- `xtrend-speed-unverified-license-withdrawal-complaints (436 words)`
- `long-asia-mas-regulation-claim-withdrawal-complaints (423 words)`
- `the-forex-funder-payout-complaints-trustpilot (410 words)`
- `true-forex-funds-closed-financial-insolvency (381 words)`
- `crypto-fund-trader-trustpilot-suspended-payout-denied (418 words)`
- `warren-bowie-smith-scam-reports-withdrawal (440 words)`
- `funded-peaks-closed-exit-scam-complaints (407 words)`
- `headway-complaints-zeroed-balances-withdrawals (410 words)`
- `alpari-withdrawal-blocked-complaints (415 words)`
- `grand-capital-unauthorised-seychelles-fsa-warning (379 words)`
- `sabiotrade-trustpilot-payout-complaints (364 words)`
- `binomo-blocked-account-withdrawal-complaints (346 words)`
- `quotex-no-license-withheld-funds-complaints (360 words)`
- `pipfarm-unpaid-payout-trustpilot-breach (331 words)`
- `for-traders-payout-denied-trustpilot-breach (348 words)`
- `traders-with-edge-closed-payout-complaints (360 words)`
- `pocket-option-no-license-blocked-accounts (358 words)`
- `olymp-trade-offshore-license-complaints (343 words)`
- `prop-number-one-false-breach-notifications (391 words)`
- `gwfx-revoked-license-uk-office-review (357 words)`
- `elites-funding-closed-payout-complaints (338 words)`
- `squared-financial-cysec-license-withdrawal-complaints (345 words)`
- `naga-bonus-profit-withholding-complaints (350 words)`
- `paxforex-cftc-permanent-ban-review (326 words)`
- `ingot-brokers-profit-withdrawal-complaints (308 words)`
- `fx2-funding-payout-account-freeze-complaints (326 words)`
- `trive-asic-license-cancelled-cfd-review (365 words)`
- `orbex-eu-exit-cysec-license-complaints (340 words)`
- `conotoxia-cysec-license-withdrawn-governance-failures (370 words)`
- `thinkmarkets-wikifx-complaints-review (221 words)`
- `doo-prime-wikifx-office-review (208 words)`
- `robomarkets-cysec-settlement-cfd-marketing-2026 (181 words)`
- `bdswiss-bafin-warning-withdrawal-complaints (174 words)`
- `hfm-philippines-sec-warning-profit-complaints (190 words)`
- `deriv-financial-commission-profit-dispute (185 words)`
- `octa-malaysia-central-bank-alert-list-wikifx-score (184 words)`
- `vantage-profit-reversal-suspicious-activity-clause (182 words)`
- `fbs-wikifx-complaint-blacklist-belize-office (178 words)`
- `oanda-nfa-fine-repeat-compliance-failures (203 words)`
- `xtb-knf-fine-cfd-client-assessment-violations (242 words)`
- `tradestation-ofac-settlement-sanctions-violations (205 words)`
- `the5ers-payout-dispute-bulk-trading-account-closure (245 words)`
- `alvexo-vpr-safe-financial-license-surrender-seychelles (217 words)`
- `t4trade-fca-warning-not-authorised-seychelles (209 words)`
- `finalto-clone-scam-fca-warning-victim (217 words)`
- `multibank-group-amf-blacklist-wikifx-complaints (230 words)`
- `justmarkets-wikifx-complaint-blacklist-score (245 words)`
- `usgfx-europefx-tradefred-asic-federal-court-penalty (238 words)`
- `atfx-atfunded-operations-pause-refunds (245 words)`
- `topstep-outages-trustpilot-update-2026 (328 words)`
- `goat-funded-trader-profit-cap-trustpilot-2026 (289 words)`
- `fintokei-propnavi-rating-correction-affiliate-2026 (281 words)`
- `smart-prop-trader-closure-refund-complaints-2026 (262 words)`
- `surgetrader-shutdown-match-trader-license-2026 (203 words)`
- `e8-markets-trustpilot-rating-hidden-fake-reviews-2026 (200 words)`
- `bespoke-funding-program-dissolved-fca-warning-2026 (215 words)`
- `alpha-futures-ninjatrader-termination-payouts-2026 (234 words)`
- `tradingfunds-ftuk-merger-prop-firm-2026 (233 words)`
- `instant-funding-funded-trading-plus-acquisition-2026 (225 words)`
- `lmax-group-five-billion-dollar-sale-2026 (438 words)`
- `top-one-trader-rules-review-2026 (385 words)`
- `tickticktrader-payout-delay-review-2026 (357 words)`
- `fundednext-labs-rule-reversal-2026 (319 words)`
- `atlas-funded-payout-review-2026 (299 words)`
- `finotive-funding-burnley-sponsorship-2026 (304 words)`
- `mex-atlantic-corporation-uae-warning-2026 (342 words)`
- `lcg-ownership-change-flowbank-2026 (340 words)`
- `admirals-infinox-estonia-license-2026 (357 words)`
- `blackbull-markets-ipo-roadshow-2026 (356 words)`

Declared word count under 500 (37):

- `aquafunded-payout-drawdown-complaints-2026 (486 declared)`
- `jfd-brokers-cysec-complaints-gbe-transfer-2026 (479 declared)`
- `falcon-funded-payout-complaints-2026 (477 declared)`
- `scope-markets-withdrawal-complaints-2026 (460 declared)`
- `tx3-funding-toptier-trader-complaints-2026 (447 declared)`
- `elite-trader-funding-payout-complaints-2026 (414 declared)`
- `brightfunded-kyc-slippage-complaints-2026 (423 declared)`
- `funded-nation-payout-complaints-unpaid (481 declared)`
- `xtrend-speed-unverified-license-withdrawal-complaints (467 declared)`
- `long-asia-mas-regulation-claim-withdrawal-complaints (488 declared)`
- `the-forex-funder-payout-complaints-trustpilot (480 declared)`
- `true-forex-funds-closed-financial-insolvency (477 declared)`
- `crypto-fund-trader-trustpilot-suspended-payout-denied (485 declared)`
- `warren-bowie-smith-scam-reports-withdrawal (480 declared)`
- `funded-peaks-closed-exit-scam-complaints (470 declared)`
- `headway-complaints-zeroed-balances-withdrawals (490 declared)`
- `alpari-withdrawal-blocked-complaints (481 declared)`
- `grand-capital-unauthorised-seychelles-fsa-warning (472 declared)`
- `sabiotrade-trustpilot-payout-complaints (451 declared)`
- `binomo-blocked-account-withdrawal-complaints (393 declared)`
- `quotex-no-license-withheld-funds-complaints (442 declared)`
- `pipfarm-unpaid-payout-trustpilot-breach (434 declared)`
- `for-traders-payout-denied-trustpilot-breach (438 declared)`
- `traders-with-edge-closed-payout-complaints (443 declared)`
- `pocket-option-no-license-blocked-accounts (434 declared)`
- `olymp-trade-offshore-license-complaints (432 declared)`
- `prop-number-one-false-breach-notifications (436 declared)`
- `gwfx-revoked-license-uk-office-review (357 declared)`
- `elites-funding-closed-payout-complaints (338 declared)`
- `squared-financial-cysec-license-withdrawal-complaints (344 declared)`
- `naga-bonus-profit-withholding-complaints (350 declared)`
- `paxforex-cftc-permanent-ban-review (326 declared)`
- `ingot-brokers-profit-withdrawal-complaints (308 declared)`
- `fx2-funding-payout-account-freeze-complaints (326 declared)`
- `trive-asic-license-cancelled-cfd-review (365 declared)`
- `orbex-eu-exit-cysec-license-complaints (340 declared)`
- `conotoxia-cysec-license-withdrawn-governance-failures (370 declared)`

Declared/measured word-count mismatch over 80 words (151):

- `fidelcrest-review-shutdown-claims-2026 (785 declared / 661 measured)`
- `blueberry-funded-review-2026 (760 declared / 656 measured)`
- `proptradetech-review-zero-trust-score-hidden-ownership (800 declared / 671 measured)`
- `prime-funding-trader-review-payout-denials-low-trust-score (790 declared / 677 measured)`
- `nexus-trader-funding-review-name-confusion-complaints (790 declared / 690 measured)`
- `funded-engineer-review-bankruptcy-unpaid-payouts (760 declared / 617 measured)`
- `xtrade-review-cysec-fine-asic-license-cancelled (895 declared / 742 measured)`
- `fxpig-fraud-allegations-fxify-merger-2026 (622 declared / 509 measured)`
- `true-forex-funds-closed-financial-insolvency (477 declared / 381 measured)`
- `grand-capital-unauthorised-seychelles-fsa-warning (472 declared / 379 measured)`
- `sabiotrade-trustpilot-payout-complaints (451 declared / 364 measured)`
- `quotex-no-license-withheld-funds-complaints (442 declared / 360 measured)`
- `pipfarm-unpaid-payout-trustpilot-breach (434 declared / 331 measured)`
- `for-traders-payout-denied-trustpilot-breach (438 declared / 348 measured)`
- `traders-with-edge-closed-payout-complaints (443 declared / 360 measured)`
- `olymp-trade-offshore-license-complaints (432 declared / 343 measured)`
- `thinkmarkets-wikifx-complaints-review (720 declared / 221 measured)`
- `doo-prime-wikifx-office-review (760 declared / 208 measured)`
- `robomarkets-cysec-settlement-cfd-marketing-2026 (730 declared / 181 measured)`
- `bdswiss-bafin-warning-withdrawal-complaints (740 declared / 174 measured)`
- `hfm-philippines-sec-warning-profit-complaints (760 declared / 190 measured)`
- `deriv-financial-commission-profit-dispute (750 declared / 185 measured)`
- `octa-malaysia-central-bank-alert-list-wikifx-score (730 declared / 184 measured)`
- `vantage-profit-reversal-suspicious-activity-clause (760 declared / 182 measured)`
- `fbs-wikifx-complaint-blacklist-belize-office (730 declared / 178 measured)`
- `oanda-nfa-fine-repeat-compliance-failures (750 declared / 203 measured)`
- `xtb-knf-fine-cfd-client-assessment-violations (790 declared / 242 measured)`
- `tradestation-ofac-settlement-sanctions-violations (760 declared / 205 measured)`
- `the5ers-payout-dispute-bulk-trading-account-closure (780 declared / 245 measured)`
- `alvexo-vpr-safe-financial-license-surrender-seychelles (790 declared / 217 measured)`
- `t4trade-fca-warning-not-authorised-seychelles (680 declared / 209 measured)`
- `finalto-clone-scam-fca-warning-victim (760 declared / 217 measured)`
- `multibank-group-amf-blacklist-wikifx-complaints (780 declared / 230 measured)`
- `justmarkets-wikifx-complaint-blacklist-score (760 declared / 245 measured)`
- `usgfx-europefx-tradefred-asic-federal-court-penalty (800 declared / 238 measured)`
- `atfx-atfunded-operations-pause-refunds (760 declared / 245 measured)`
- `topstep-outages-trustpilot-update-2026 (690 declared / 328 measured)`
- `goat-funded-trader-profit-cap-trustpilot-2026 (670 declared / 289 measured)`
- `fintokei-propnavi-rating-correction-affiliate-2026 (650 declared / 281 measured)`
- `smart-prop-trader-closure-refund-complaints-2026 (680 declared / 262 measured)`
- `surgetrader-shutdown-match-trader-license-2026 (650 declared / 203 measured)`
- `e8-markets-trustpilot-rating-hidden-fake-reviews-2026 (590 declared / 200 measured)`
- `bespoke-funding-program-dissolved-fca-warning-2026 (760 declared / 215 measured)`
- `alpha-futures-ninjatrader-termination-payouts-2026 (700 declared / 234 measured)`
- `tradingfunds-ftuk-merger-prop-firm-2026 (680 declared / 233 measured)`
- `instant-funding-funded-trading-plus-acquisition-2026 (680 declared / 225 measured)`
- `lmax-group-five-billion-dollar-sale-2026 (720 declared / 438 measured)`
- `top-one-trader-rules-review-2026 (760 declared / 385 measured)`
- `tickticktrader-payout-delay-review-2026 (680 declared / 357 measured)`
- `fundednext-labs-rule-reversal-2026 (680 declared / 319 measured)`
- `atlas-funded-payout-review-2026 (700 declared / 299 measured)`
- `finotive-funding-burnley-sponsorship-2026 (670 declared / 304 measured)`
- `mex-atlantic-corporation-uae-warning-2026 (760 declared / 342 measured)`
- `lcg-ownership-change-flowbank-2026 (710 declared / 340 measured)`
- `admirals-infinox-estonia-license-2026 (800 declared / 357 measured)`
- `blackbull-markets-ipo-roadshow-2026 (720 declared / 356 measured)`
- `tradeview-markets-fund-removal-complaints-cnmv-warning (980 declared / 816 measured)`
- `fullerton-markets-out-of-business-2026 (950 declared / 754 measured)`
- `maven-trading-non-disparagement-clause-fake-reviews-2026 (1000 declared / 897 measured)`
- `earn2trade-pass-rate-withdrawal-data-2026 (940 declared / 737 measured)`
- `myfundedfutures-ranking-compliance-history-2026 (1010 declared / 839 measured)`
- `fx-volumes-july-2026 (980 declared / 725 measured)`
- `mbx-pro-financial-commission (940 declared / 752 measured)`
- `kraken-payward-q2-2026-results (970 declared / 746 measured)`
- `pepperstone-cto-nigel-fernandes (950 declared / 697 measured)`
- `axi-executive-departures (930 declared / 755 measured)`
- `stonex-banco-travelex-acquisition (950 declared / 742 measured)`
- `gfa-capital-markets-asic-suspension (970 declared / 787 measured)`
- `equiti-al-wahda-sponsorship (940 declared / 786 measured)`
- `ctrader-ai-agents-cli (960 declared / 767 measured)`
- `xtb-systematic-internaliser (990 declared / 816 measured)`
- `asic-nine-broker-review-warning (1040 declared / 827 measured)`
- `kraken-prop-sp500-funded-trading (1030 declared / 852 measured)`
- `plus500-bifci-bahamas-offshore (1060 declared / 892 measured)`
- `revolut-cyprus-crypto-ceo-vasiliou (990 declared / 839 measured)`
- `etoro-tradezero-acquisition-q2-2026 (970 declared / 861 measured)`
- `avatrade-canada-provincial-warnings-not-registered (1050 declared / 920 measured)`
- `avatrade-israel-atrade-misleading-video-fine (950 declared / 803 measured)`
- `naga-capex-key-way-reverse-merger-2024 (1050 declared / 955 measured)`
- `avatrade-israel-atrade-isa-unlicensed-services-fine (1050 declared / 903 measured)`
- `avatrade-alberta-securities-commission-settlement-2020 (1050 declared / 878 measured)`
- `avatrade-belgium-fsma-settlement (1000 declared / 905 measured)`
- `naga-markets-cysec-150000-settlement (1050 declared / 894 measured)`
- `squaredfinancial-sq-sey-cysec-settlement-2025 (1050 declared / 944 measured)`
- `royal-forex-roinvesting-cysec-settlements-licence (1050 declared / 825 measured)`
- `trade-com-leadcapital-cysec-fine (950 declared / 839 measured)`
- `ufx-reliantco-cysec-fine (1000 declared / 855 measured)`
- `fxview-charlgate-cysec-settlement-2024 (950 declared / 798 measured)`
- `fxvc-finteractive-cysec-fine-licence-renounced (950 declared / 716 measured)`
- `101investing-fxbfi-cysec-fines-licence-withdrawn (1000 declared / 691 measured)`
- `magnum-fx-cysec-fine-licence-withdrawal (950 declared / 664 measured)`
- `f1-markets-cysec-fine-2022 (980 declared / 684 measured)`
- `axiance-icc-intercertus-cysec-settlement (900 declared / 697 measured)`
- `velos-global-markets-asic-licence-cancelled-2025 (900 declared / 681 measured)`
- `jp-markets-fsca-fine-otc-derivatives (950 declared / 698 measured)`
- `rockfort-markets-fma-licence-cancelled-2024 (980 declared / 675 measured)`
- `fxoro-mca-intelifunds-cysec-fine-2024 (1050 declared / 700 measured)`
- `fxtb-forex-tb-fca-fine-2024 (1050 declared / 707 measured)`
- `depaho-fxgm-cysec-fine-licence-suspension (1100 declared / 861 measured)`
- `hoch-capital-itrader-tradeatf-cysec-fine-licence (1100 declared / 868 measured)`
- `cfi-credit-financier-invest-cysec-aml-settlement-2022 (1000 declared / 846 measured)`
- `begin-capital-markets-cysec-settlements-2022 (1000 declared / 784 measured)`
- `general-capital-brokers-cysec-settlement-2022 (950 declared / 862 measured)`
- `fp-markets-eu-cysec-fine-cfd-retail-protection-2026 (1100 declared / 926 measured)`
- `itrade-global-cysec-licence-withdrawal-2025 (1050 declared / 865 measured)`
- `colmex-pro-cysec-200000-settlement-2025 (1100 declared / 857 measured)`
- `fxnet-cysec-225000-settlement-2025 (1100 declared / 828 measured)`
- `fxtm-forextime-fca-licence-surrender-2026 (1100 declared / 852 measured)`
- `union-standard-asic-record-300-million-penalties-europefx-tradefx-cfd (1350 declared / 886 measured)`
- `triangleview-3anglefx-cysec-full-suspension-aml-governance (1050 declared / 775 measured)`
- `afrimarkets-capital-fsca-licence-withdrawal-client-fund-misappropriation-banxso (1100 declared / 771 measured)`
- `banxso-liquidation-fsca-fines-r2-billion-fake-celebrity-advertisements (1200 declared / 869 measured)`
- `forex24-cysec-transaction-reporting-failures-lydya-ltd (950 declared / 787 measured)`
- `htfx-shuts-down-worldwide-cysec-fca-licences-lost-vanuatu (1100 declared / 793 measured)`
- `traders-trust-cysec-licence-renunciation-16-years-ttcm (1000 declared / 783 measured)`
- `conotoxia-cysec-licence-withdrawal-suspension (1050 declared / 840 measured)`
- `imermarket-invesacapital-fsca-provisional-licence-withdrawal-cfds (1000 declared / 794 measured)`
- `mixirite-fsca-provisional-licence-withdrawal-umarketpro-protea-markets (1150 declared / 831 measured)`
- `quicktrade-fsca-aml-fine-south-africa-710000-rand (1050 declared / 764 measured)`
- `saxo-bank-aml-fine-denmark-dkk-313-million-finanstilsynet (1400 declared / 945 measured)`
- `fxopen-au-asic-licence-cancellation-human-resources (1100 declared / 845 measured)`
- `prospero-markets-asic-licence-cancellation-money-laundering (1300 declared / 924 measured)`
- `xtrade-fca-licence-cancellation-vulnerable-clients-cfds (1200 declared / 846 measured)`
- `ic-markets-eu-cysec-fine-margin-circumvention-retail-cfds (1250 declared / 994 measured)`
- `trive-asic-licence-cancellation-cfd-deficiencies (1050 declared / 904 measured)`
- `ironfx-notesco-cysec-settlement-cfd-marketing (1150 declared / 589 measured)`
- `forex-com-nfa-fine-account-adjustments-platform-glitch (1250 declared / 729 measured)`
- `forex-ct-asic-20-million-penalty-unconscionable-conduct (1450 declared / 596 measured)`
- `oanda-cftc-fine-net-capital-dividends (1150 declared / 677 measured)`
- `etoro-sec-settlement-unregistered-crypto-broker (1300 declared / 668 measured)`
- `fxcm-cftc-fine-no-dealing-desk-fraud-us-exit (1500 declared / 849 measured)`
- `alvexo-operator-cysec-settlement-licence-withdrawal (1350 declared / 500 measured)`
- `infinox-fca-fine-mifir-transaction-reporting-failure (1300 declared / 581 measured)`
- `ic-markets-948-million-class-action-federal-court-australia (1700 declared / 1190 measured)`
- `celsius-network-cftc-enforcement-report-2026 (1600 declared / 745 measured)`
- `binance-australia-asic-10-million-penalty-retail-classification (1400 declared / 574 measured)`
- `darren-reynolds-fca-ban-british-steel-pension (1400 declared / 562 measured)`
- `myforexfunds-cftc-fraud-20-billion-freeze (1500 declared / 652 measured)`
- `canaccord-genuity-fincen-80-million-bsa-penalty (1500 declared / 660 measured)`
- `pictet-overseas-finra-aml-warning-ignored (1300 declared / 685 measured)`
- `blue-ocean-ats-finra-aml-overnight-trading (1400 declared / 821 measured)`
- `falconx-cftc-fine-unregistered-futures-commission-merchant (1200 declared / 734 measured)`
- `bluesky-wealth-frank-breuer-lifetime-ban-pension-fraud (1300 declared / 759 measured)`
- `dinosaur-merchant-bank-fca-fine-cfd-surveillance-failure (1300 declared / 827 measured)`
- `etoro-ai-agents-grok-autopilot-trading (1200 declared / 790 measured)`
- `ig-trade-responsibly-3000-free-shares-incentive (950 declared / 653 measured)`
- `pepperstone-awards-vs-complaints-offshore-entity (1050 declared / 736 measured)`
- `plus500-prediction-markets-gamble-regulation (1100 declared / 807 measured)`
- `fxcm-stratos-jefferies-sale-long-fall (900 declared / 767 measured)`
- `saxo-bank-42m-aml-fine-premium-myth (1100 declared / 706 measured)`
- `plus500-buyback-binge-capital-strength-or-illusion (780 declared / 650 measured)`

### Metadata length

Meta title under 45 characters (16):

- `solid-ecn-review-fictitious-misa-license (41 chars)`
- `errante-review-complaints-leverage-2026 (39 chars)`
- `ninjatrader-nfa-aml-fine-review-2026 (41 chars)`
- `rebelsfunding-payout-refusal-review-2026 (43 chars)`
- `funding-pips-account-breach-review-2026 (44 chars)`
- `audacity-capital-rating-suspended-drawdown-complaints-2026 (44 chars)`
- `capex-com-withdrawal-complaints-2026 (44 chars)`
- `roboforex-profit-reversal-complaints-2026 (44 chars)`
- `taurex-rating-suspended-profit-complaints-2026 (43 chars)`
- `true-forex-funds-closed-financial-insolvency (44 chars)`
- `doo-prime-wikifx-office-review (44 chars)`
- `robomarkets-cysec-settlement-cfd-marketing-2026 (43 chars)`
- `deriv-financial-commission-profit-dispute (41 chars)`
- `oanda-nfa-fine-repeat-compliance-failures (44 chars)`
- `xtb-knf-fine-cfd-client-assessment-violations (42 chars)`
- `usgfx-europefx-tradefred-asic-federal-court-penalty (42 chars)`

Meta title over 60 characters (69):

- `tickticktrader-payout-delay-review-2026 (63 chars)`
- `fx-volumes-july-2026 (68 chars)`
- `mbx-pro-financial-commission (64 chars)`
- `kraken-payward-q2-2026-results (66 chars)`
- `pepperstone-cto-nigel-fernandes (62 chars)`
- `axi-executive-departures (63 chars)`
- `equiti-al-wahda-sponsorship (62 chars)`
- `ctrader-ai-agents-cli (62 chars)`
- `kraken-prop-sp500-funded-trading (63 chars)`
- `plus500-bifci-bahamas-offshore (63 chars)`
- `revolut-cyprus-crypto-ceo-vasiliou (61 chars)`
- `avatrade-canada-provincial-warnings-not-registered (66 chars)`
- `naga-bafin-market-manipulation-examination-ipo (65 chars)`
- `avatrade-israel-atrade-misleading-video-fine (65 chars)`
- `naga-capex-key-way-reverse-merger-2024 (63 chars)`
- `avatrade-israel-atrade-isa-unlicensed-services-fine (65 chars)`
- `naga-cofounder-yasin-qureshi-cum-ex-conviction (65 chars)`
- `avatrade-alberta-securities-commission-settlement-2020 (67 chars)`
- `naga-group-2022-loss-auditor-restatement (61 chars)`
- `avatrade-belgium-fsma-settlement (65 chars)`
- `naga-markets-cysec-150000-settlement (63 chars)`
- `squaredfinancial-sq-sey-cysec-settlement-2025 (63 chars)`
- `royal-forex-roinvesting-cysec-settlements-licence (68 chars)`
- `fxview-charlgate-cysec-settlement-2024 (67 chars)`
- `fxvc-finteractive-cysec-fine-licence-renounced (66 chars)`
- `101investing-fxbfi-cysec-fines-licence-withdrawn (63 chars)`
- `axiance-icc-intercertus-cysec-settlement (67 chars)`
- `velos-global-markets-asic-licence-cancelled-2025 (66 chars)`
- `jp-markets-fsca-fine-otc-derivatives (61 chars)`
- `fxoro-mca-intelifunds-cysec-fine-2024 (65 chars)`
- `depaho-fxgm-cysec-fine-licence-suspension (63 chars)`
- `cfi-credit-financier-invest-cysec-aml-settlement-2022 (63 chars)`
- `begin-capital-markets-cysec-settlements-2022 (61 chars)`
- `general-capital-brokers-cysec-settlement-2022 (66 chars)`
- `fp-markets-eu-cysec-fine-cfd-retail-protection-2026 (64 chars)`
- `itrade-global-cysec-licence-withdrawal-2025 (63 chars)`
- `colmex-pro-cysec-200000-settlement-2025 (61 chars)`
- `union-standard-asic-record-300-million-penalties-europefx-tradefx-cfd (97 chars)`
- `triangleview-3anglefx-cysec-full-suspension-aml-governance (79 chars)`
- `afrimarkets-capital-fsca-licence-withdrawal-client-fund-misappropriation-banxso (73 chars)`
- `banxso-liquidation-fsca-fines-r2-billion-fake-celebrity-advertisements (73 chars)`
- `forex24-cysec-transaction-reporting-failures-lydya-ltd (76 chars)`
- `htfx-shuts-down-worldwide-cysec-fca-licences-lost-vanuatu (61 chars)`
- `traders-trust-cysec-licence-renunciation-16-years-ttcm (61 chars)`
- `imermarket-invesacapital-fsca-provisional-licence-withdrawal-cfds (93 chars)`
- `mixirite-fsca-provisional-licence-withdrawal-umarketpro-protea-markets (80 chars)`
- `quicktrade-fsca-aml-fine-south-africa-710000-rand (66 chars)`
- `saxo-bank-aml-fine-denmark-dkk-313-million-finanstilsynet (68 chars)`
- `fxopen-au-asic-licence-cancellation-human-resources (66 chars)`
- `prospero-markets-asic-licence-cancellation-money-laundering (70 chars)`
- `xtrade-fca-licence-cancellation-vulnerable-clients-cfds (61 chars)`
- `ic-markets-eu-cysec-fine-margin-circumvention-retail-cfds (71 chars)`
- `trive-asic-licence-cancellation-cfd-deficiencies (63 chars)`
- `alvexo-operator-cysec-settlement-licence-withdrawal (71 chars)`
- `infinox-fca-fine-mifir-transaction-reporting-failure (67 chars)`
- `ic-markets-948-million-class-action-federal-court-australia (67 chars)`
- `celsius-network-cftc-enforcement-report-2026 (80 chars)`
- `binance-australia-asic-10-million-penalty-retail-classification (79 chars)`
- `darren-reynolds-fca-ban-british-steel-pension (84 chars)`
- `myforexfunds-cftc-fraud-20-billion-freeze (80 chars)`
- `canaccord-genuity-fincen-80-million-bsa-penalty (95 chars)`
- `pictet-overseas-finra-aml-warning-ignored (82 chars)`
- `blue-ocean-ats-finra-aml-overnight-trading (70 chars)`
- `falconx-cftc-fine-unregistered-futures-commission-merchant (61 chars)`
- `bluesky-wealth-frank-breuer-lifetime-ban-pension-fraud (72 chars)`
- `dinosaur-merchant-bank-fca-fine-cfd-surveillance-failure (73 chars)`
- `etoro-ai-agents-grok-autopilot-trading (80 chars)`
- `ig-trade-responsibly-3000-free-shares-incentive (92 chars)`
- `plus500-buyback-binge-capital-strength-or-illusion (67 chars)`

Meta description under 140 characters (11):

- `funded-nation-payout-complaints-unpaid (139 chars)`
- `long-asia-mas-regulation-claim-withdrawal-complaints (137 chars)`
- `the-forex-funder-payout-complaints-trustpilot (137 chars)`
- `doo-prime-wikifx-office-review (136 chars)`
- `oanda-nfa-fine-repeat-compliance-failures (131 chars)`
- `t4trade-fca-warning-not-authorised-seychelles (136 chars)`
- `atfx-atfunded-operations-pause-refunds (133 chars)`
- `goat-funded-trader-profit-cap-trustpilot-2026 (136 chars)`
- `e8-markets-trustpilot-rating-hidden-fake-reviews-2026 (139 chars)`
- `bespoke-funding-program-dissolved-fca-warning-2026 (136 chars)`
- `tradingfunds-ftuk-merger-prop-firm-2026 (136 chars)`

Meta description over 160 characters (64):

- `lcg-ownership-change-flowbank-2026 (161 chars)`
- `avatrade-canada-provincial-warnings-not-registered (163 chars)`
- `naga-bafin-market-manipulation-examination-ipo (165 chars)`
- `avatrade-israel-atrade-misleading-video-fine (165 chars)`
- `naga-capex-key-way-reverse-merger-2024 (163 chars)`
- `avatrade-israel-atrade-isa-unlicensed-services-fine (171 chars)`
- `naga-group-2022-loss-auditor-restatement (165 chars)`
- `avatrade-belgium-fsma-settlement (164 chars)`
- `naga-markets-cysec-150000-settlement (162 chars)`
- `squaredfinancial-sq-sey-cysec-settlement-2025 (176 chars)`
- `royal-forex-roinvesting-cysec-settlements-licence (187 chars)`
- `fxview-charlgate-cysec-settlement-2024 (170 chars)`
- `fxvc-finteractive-cysec-fine-licence-renounced (167 chars)`
- `magnum-fx-cysec-fine-licence-withdrawal (169 chars)`
- `f1-markets-cysec-fine-2022 (174 chars)`
- `axiance-icc-intercertus-cysec-settlement (173 chars)`
- `velos-global-markets-asic-licence-cancelled-2025 (172 chars)`
- `jp-markets-fsca-fine-otc-derivatives (172 chars)`
- `rockfort-markets-fma-licence-cancelled-2024 (170 chars)`
- `depaho-fxgm-cysec-fine-licence-suspension (171 chars)`
- `cfi-credit-financier-invest-cysec-aml-settlement-2022 (177 chars)`
- `begin-capital-markets-cysec-settlements-2022 (161 chars)`
- `general-capital-brokers-cysec-settlement-2022 (168 chars)`
- `exclusive-change-capital-cysec-settlement (162 chars)`
- `colmex-pro-cysec-200000-settlement-2025 (162 chars)`
- `fxtm-forextime-fca-licence-surrender-2026 (166 chars)`
- `union-standard-asic-record-300-million-penalties-europefx-tradefx-cfd (258 chars)`
- `triangleview-3anglefx-cysec-full-suspension-aml-governance (257 chars)`
- `afrimarkets-capital-fsca-licence-withdrawal-client-fund-misappropriation-banxso (250 chars)`
- `banxso-liquidation-fsca-fines-r2-billion-fake-celebrity-advertisements (236 chars)`
- `forex24-cysec-transaction-reporting-failures-lydya-ltd (265 chars)`
- `htfx-shuts-down-worldwide-cysec-fca-licences-lost-vanuatu (219 chars)`
- `traders-trust-cysec-licence-renunciation-16-years-ttcm (230 chars)`
- `conotoxia-cysec-licence-withdrawal-suspension (219 chars)`
- `imermarket-invesacapital-fsca-provisional-licence-withdrawal-cfds (218 chars)`
- `mixirite-fsca-provisional-licence-withdrawal-umarketpro-protea-markets (260 chars)`
- `quicktrade-fsca-aml-fine-south-africa-710000-rand (220 chars)`
- `saxo-bank-aml-fine-denmark-dkk-313-million-finanstilsynet (245 chars)`
- `fxopen-au-asic-licence-cancellation-human-resources (198 chars)`
- `prospero-markets-asic-licence-cancellation-money-laundering (212 chars)`
- `xtrade-fca-licence-cancellation-vulnerable-clients-cfds (209 chars)`
- `ic-markets-eu-cysec-fine-margin-circumvention-retail-cfds (193 chars)`
- `trive-asic-licence-cancellation-cfd-deficiencies (268 chars)`
- `ironfx-notesco-cysec-settlement-cfd-marketing (181 chars)`
- `forex-com-nfa-fine-account-adjustments-platform-glitch (180 chars)`
- `forex-ct-asic-20-million-penalty-unconscionable-conduct (173 chars)`
- `oanda-cftc-fine-net-capital-dividends (174 chars)`
- `etoro-sec-settlement-unregistered-crypto-broker (193 chars)`
- `fxcm-cftc-fine-no-dealing-desk-fraud-us-exit (174 chars)`
- `alvexo-operator-cysec-settlement-licence-withdrawal (216 chars)`
- `infinox-fca-fine-mifir-transaction-reporting-failure (207 chars)`
- `ic-markets-948-million-class-action-federal-court-australia (268 chars)`
- `celsius-network-cftc-enforcement-report-2026 (174 chars)`
- `binance-australia-asic-10-million-penalty-retail-classification (218 chars)`
- `darren-reynolds-fca-ban-british-steel-pension (216 chars)`
- `myforexfunds-cftc-fraud-20-billion-freeze (247 chars)`
- `canaccord-genuity-fincen-80-million-bsa-penalty (256 chars)`
- `pictet-overseas-finra-aml-warning-ignored (258 chars)`
- `blue-ocean-ats-finra-aml-overnight-trading (183 chars)`
- `falconx-cftc-fine-unregistered-futures-commission-merchant (209 chars)`
- `bluesky-wealth-frank-breuer-lifetime-ban-pension-fraud (192 chars)`
- `dinosaur-merchant-bank-fca-fine-cfd-surveillance-failure (196 chars)`
- `etoro-ai-agents-grok-autopilot-trading (178 chars)`
- `ig-trade-responsibly-3000-free-shares-incentive (166 chars)`

Headlines over Google's 110-character guidance (0):

- None

Publication dates supplied without an explicit time in source data (286):

- `traders-central-fund-review-acquisition-closed-accounts-2026`
- `the-trading-capital-review-2026`
- `swift-funding-metaquotes-metatrader-ban-2026`
- `fidelcrest-review-shutdown-claims-2026`
- `blueberry-funded-review-2026`
- `proptradetech-review-zero-trust-score-hidden-ownership`
- `prime-funding-trader-review-payout-denials-low-trust-score`
- `nexus-trader-funding-review-name-confusion-complaints`
- `global-funded-trader-review-unverified-payout-claims`
- `funded-engineer-review-bankruptcy-unpaid-payouts`
- `xtrade-review-cysec-fine-asic-license-cancelled`
- `solid-ecn-review-fictitious-misa-license`
- `lmfx-review-offshore-entities-no-regulator`
- `larson-and-holz-review-amf-blacklist-no-regulator`
- `ic-funded-review-payout-complaints-account-closures`
- `iux-markets-review-withdrawal-complaints-2026`
- `freshforex-review-unregulated-2026`
- `forex4you-markets4you-review-2026`
- `errante-review-complaints-leverage-2026`
- `accentforex-pamm-complaint-review-2026`
- `generic-trade-review-clean-record-2026`
- `gain-capital-cftc-order-review-2026`
- `fundedbull-closed-flag-review-2026`
- `edgeclear-review-clean-record-2026`
- `bux-afm-fine-inducements-ban-2026`
- `transworld-futures-cftc-review-2026`
- `trading-212-ombudsman-isa-transfer-review-2026`
- `the-funded-trader-lawsuit-review-2026`
- `optimus-flow-funded-program-disclosure-review-2026`
- `ninjatrader-nfa-aml-fine-review-2026`
- `rebelsfunding-payout-refusal-review-2026`
- `iq-option-rbi-alert-list-review-2026`
- `funding-pips-account-breach-review-2026`
- `atmos-funded-risk-interview-payout-review-2026`
- `tradeday-third-party-payout-complaint-2026`
- `leeloo-trading-payout-cuts-complaints-2026`
- `funded-trading-plus-service-acquisition-complaints-2026`
- `apex-trader-funding-id-verification-complaints-2026`
- `wetrade-capital-rating-distinct-award-brand-2026`
- `madafx-domain-chinese-gambling-site-2026`
- `funder-trading-educator-terms-review-2026`
- `capital-com-cysec-fine-late-stor-reports-2026`
- `ara-markets-asic-registration-not-found-2026`
- `ncm-investment-licence-claims-unverified-2026`
- `land-fx-mauritius-entity-licence-review-2026`
- `hankotrade-cftc-red-list-rating-2026`
- `fxoptimax-regulatory-attention-zero-reviews-2026`
- `direct-tt-domain-real-trading-uk-warning-2026`
- `tradefundrr-review-rating-payout-evidence-2026`
- `kab-strategy-cysec-licence-withdrawal-2026`
- `amega-complaints-mt5-funds-withdrawn-2026`
- `hfx-domains-listed-for-sale-review-2026`
- `blue-forex-funds-complaints-unpaid-accounts-2026`
- `npb-markets-rating-suspended-funds-complaints-2026`
- `vault-funder-review-conflicting-closure-status-2026`
- `next-funded-domain-listed-for-sale-2026`
- `trade-capital-funding-domain-sale-2026`
- `investmarkets-complaints-trustpilot-rating-2026`
- `elite-funded-offline-payout-complaints-2026`
- `funded-pro-trader-review-complaints-2026`
- `funded-edge-review-tracking-gate-2026`
- `crown-funded-review-transparency-2026`
- `adrofx-website-closed-withdrawal-complaints-2026`
- `alphaapexcapital-apex-capital-funding-complaints-2026`
- `fxpig-fraud-allegations-fxify-merger-2026`
- `blue-guardian-review-rating-2026`
- `forex-capital-funds-domain-sale-account-complaints-2026`
- `nova-funding-shuts-down-payout-complaints-2026`
- `fundingticks-shuts-down-retroactive-rule-backlash-2026`
- `fundedelite-rating-suspended-ip-rule-complaints-2026`
- `n1cm-rating-suspended-withdrawal-complaints-2026`
- `audacity-capital-rating-suspended-drawdown-complaints-2026`
- `cfi-financial-rating-suspended-stop-loss-complaints-2026`
- `trade-com-rating-suspended-withdrawal-complaints-2026`
- `the-trading-pit-rating-suspended-payout-complaints-2026`
- `funderpro-rating-suspended-payout-complaints-2026`
- `capex-com-withdrawal-complaints-2026`
- `hycm-complaints-rating-2026`
- `weltrade-rating-suspended-withdrawal-complaints-2026`
- `nordfx-rbi-alert-list-warning-2026`
- `fusion-markets-rbi-alert-list-warning-2026`
- `fxpro-rating-suspended-withdrawal-complaints-2026`
- `fxgt-profit-denied-rule-violation-complaints-2026`
- `pu-prime-rating-suspended-profit-blocked-complaints-2026`
- `instaforex-withdrawal-complaints-2026`
- `startrader-withdrawal-complaints-march-2026`
- `eightcap-rating-suspended-complaints-2026`
- `windsor-brokers-ontario-warning-2026`
- `moneta-markets-withdrawal-complaints-2026`
- `go-markets-withheld-profits-complaints-2026`
- `vt-markets-rating-suspended-fund-complaints-2026`
- `exness-philippine-sec-warning-2026`
- `fxtm-zero-spread-complaints-2026`
- `lark-funding-payout-complaints-2026`
- `roboforex-profit-reversal-complaints-2026`
- `ifc-markets-withdrawal-fee-complaints-2026`
- `teletrade-withdrawal-delay-complaints-2026`
- `taurex-rating-suspended-profit-complaints-2026`
- `darwinex-rating-suspended-risk-engine-complaints-2026`
- `tickmill-rating-suspended-withdrawal-complaints-2026`
- `activtrades-rating-suspended-profit-complaints-2026`
- `tmgm-withheld-deposit-complaints-2026`
- `fxprimus-withdrawal-complaints-2026`
- `aquafunded-payout-drawdown-complaints-2026`
- `uprofit-trader-daily-loss-limit-payout-complaints`
- `fxdd-malta-license-surrender-2026`
- `jfd-brokers-cysec-complaints-gbe-transfer-2026`
- `falcon-funded-payout-complaints-2026`
- `scope-markets-withdrawal-complaints-2026`
- `tx3-funding-toptier-trader-complaints-2026`
- `elite-trader-funding-payout-complaints-2026`
- `brightfunded-kyc-slippage-complaints-2026`
- `funded-nation-payout-complaints-unpaid`
- `xtrend-speed-unverified-license-withdrawal-complaints`
- `long-asia-mas-regulation-claim-withdrawal-complaints`
- `the-forex-funder-payout-complaints-trustpilot`
- `true-forex-funds-closed-financial-insolvency`
- `crypto-fund-trader-trustpilot-suspended-payout-denied`
- `warren-bowie-smith-scam-reports-withdrawal`
- `funded-peaks-closed-exit-scam-complaints`
- `headway-complaints-zeroed-balances-withdrawals`
- `alpari-withdrawal-blocked-complaints`
- `grand-capital-unauthorised-seychelles-fsa-warning`
- `sabiotrade-trustpilot-payout-complaints`
- `binomo-blocked-account-withdrawal-complaints`
- `quotex-no-license-withheld-funds-complaints`
- `pipfarm-unpaid-payout-trustpilot-breach`
- `for-traders-payout-denied-trustpilot-breach`
- `traders-with-edge-closed-payout-complaints`
- `pocket-option-no-license-blocked-accounts`
- `olymp-trade-offshore-license-complaints`
- `prop-number-one-false-breach-notifications`
- `gwfx-revoked-license-uk-office-review`
- `elites-funding-closed-payout-complaints`
- `squared-financial-cysec-license-withdrawal-complaints`
- `naga-bonus-profit-withholding-complaints`
- `paxforex-cftc-permanent-ban-review`
- `ingot-brokers-profit-withdrawal-complaints`
- `fx2-funding-payout-account-freeze-complaints`
- `trive-asic-license-cancelled-cfd-review`
- `orbex-eu-exit-cysec-license-complaints`
- `conotoxia-cysec-license-withdrawn-governance-failures`
- `thinkmarkets-wikifx-complaints-review`
- `doo-prime-wikifx-office-review`
- `robomarkets-cysec-settlement-cfd-marketing-2026`
- `bdswiss-bafin-warning-withdrawal-complaints`
- `hfm-philippines-sec-warning-profit-complaints`
- `deriv-financial-commission-profit-dispute`
- `octa-malaysia-central-bank-alert-list-wikifx-score`
- `vantage-profit-reversal-suspicious-activity-clause`
- `fbs-wikifx-complaint-blacklist-belize-office`
- `oanda-nfa-fine-repeat-compliance-failures`
- `xtb-knf-fine-cfd-client-assessment-violations`
- `tradestation-ofac-settlement-sanctions-violations`
- `the5ers-payout-dispute-bulk-trading-account-closure`
- `alvexo-vpr-safe-financial-license-surrender-seychelles`
- `t4trade-fca-warning-not-authorised-seychelles`
- `finalto-clone-scam-fca-warning-victim`
- `multibank-group-amf-blacklist-wikifx-complaints`
- `justmarkets-wikifx-complaint-blacklist-score`
- `usgfx-europefx-tradefred-asic-federal-court-penalty`
- `atfx-atfunded-operations-pause-refunds`
- `topstep-outages-trustpilot-update-2026`
- `goat-funded-trader-profit-cap-trustpilot-2026`
- `fintokei-propnavi-rating-correction-affiliate-2026`
- `smart-prop-trader-closure-refund-complaints-2026`
- `surgetrader-shutdown-match-trader-license-2026`
- `e8-markets-trustpilot-rating-hidden-fake-reviews-2026`
- `bespoke-funding-program-dissolved-fca-warning-2026`
- `alpha-futures-ninjatrader-termination-payouts-2026`
- `tradingfunds-ftuk-merger-prop-firm-2026`
- `instant-funding-funded-trading-plus-acquisition-2026`
- `lmax-group-five-billion-dollar-sale-2026`
- `top-one-trader-rules-review-2026`
- `tickticktrader-payout-delay-review-2026`
- `fundednext-labs-rule-reversal-2026`
- `atlas-funded-payout-review-2026`
- `finotive-funding-burnley-sponsorship-2026`
- `mex-atlantic-corporation-uae-warning-2026`
- `lcg-ownership-change-flowbank-2026`
- `admirals-infinox-estonia-license-2026`
- `blackbull-markets-ipo-roadshow-2026`
- `swissquote-shares-fall-h1-2026-crypto-guidance-cut`
- `tradeview-markets-fund-removal-complaints-cnmv-warning`
- `qt-funded-quant-tekel-payout-denial-pattern-2026`
- `fullerton-markets-out-of-business-2026`
- `take-profit-trader-drawdown-rules-2026`
- `maven-trading-non-disparagement-clause-fake-reviews-2026`
- `earn2trade-pass-rate-withdrawal-data-2026`
- `bulenox-consistency-rule-payout-denial-2026`
- `lux-trading-firm-withdrawal-review-2026`
- `myfundedfutures-ranking-compliance-history-2026`
- `fx-volumes-july-2026`
- `mbx-pro-financial-commission`
- `kraken-payward-q2-2026-results`
- `pepperstone-cto-nigel-fernandes`
- `axi-executive-departures`
- `stonex-banco-travelex-acquisition`
- `gfa-capital-markets-asic-suspension`
- `equiti-al-wahda-sponsorship`
- `ctrader-ai-agents-cli`
- `xtb-systematic-internaliser`
- `asic-nine-broker-review-warning`
- `kraken-prop-sp500-funded-trading`
- `plus500-bifci-bahamas-offshore`
- `revolut-cyprus-crypto-ceo-vasiliou`
- `etoro-tradezero-acquisition-q2-2026`
- `avatrade-canada-provincial-warnings-not-registered`
- `naga-bafin-market-manipulation-examination-ipo`
- `avatrade-israel-atrade-misleading-video-fine`
- `naga-capex-key-way-reverse-merger-2024`
- `avatrade-israel-atrade-isa-unlicensed-services-fine`
- `naga-cofounder-yasin-qureshi-cum-ex-conviction`
- `avatrade-alberta-securities-commission-settlement-2020`
- `naga-group-2022-loss-auditor-restatement`
- `avatrade-belgium-fsma-settlement`
- `naga-markets-cysec-150000-settlement`
- `squaredfinancial-sq-sey-cysec-settlement-2025`
- `royal-forex-roinvesting-cysec-settlements-licence`
- `trade-com-leadcapital-cysec-fine`
- `ufx-reliantco-cysec-fine`
- `fxview-charlgate-cysec-settlement-2024`
- `fxvc-finteractive-cysec-fine-licence-renounced`
- `101investing-fxbfi-cysec-fines-licence-withdrawn`
- `magnum-fx-cysec-fine-licence-withdrawal`
- `f1-markets-cysec-fine-2022`
- `axiance-icc-intercertus-cysec-settlement`
- `velos-global-markets-asic-licence-cancelled-2025`
- `jp-markets-fsca-fine-otc-derivatives`
- `rockfort-markets-fma-licence-cancelled-2024`
- `fxoro-mca-intelifunds-cysec-fine-2024`
- `fxtb-forex-tb-fca-fine-2024`
- `depaho-fxgm-cysec-fine-licence-suspension`
- `hoch-capital-itrader-tradeatf-cysec-fine-licence`
- `cfi-credit-financier-invest-cysec-aml-settlement-2022`
- `begin-capital-markets-cysec-settlements-2022`
- `general-capital-brokers-cysec-settlement-2022`
- `exclusive-change-capital-cysec-settlement`
- `fp-markets-eu-cysec-fine-cfd-retail-protection-2026`
- `itrade-global-cysec-licence-withdrawal-2025`
- `colmex-pro-cysec-200000-settlement-2025`
- `fxnet-cysec-225000-settlement-2025`
- `fxtm-forextime-fca-licence-surrender-2026`
- `union-standard-asic-record-300-million-penalties-europefx-tradefx-cfd`
- `triangleview-3anglefx-cysec-full-suspension-aml-governance`
- `afrimarkets-capital-fsca-licence-withdrawal-client-fund-misappropriation-banxso`
- `banxso-liquidation-fsca-fines-r2-billion-fake-celebrity-advertisements`
- `forex24-cysec-transaction-reporting-failures-lydya-ltd`
- `htfx-shuts-down-worldwide-cysec-fca-licences-lost-vanuatu`
- `traders-trust-cysec-licence-renunciation-16-years-ttcm`
- `conotoxia-cysec-licence-withdrawal-suspension`
- `imermarket-invesacapital-fsca-provisional-licence-withdrawal-cfds`
- `mixirite-fsca-provisional-licence-withdrawal-umarketpro-protea-markets`
- `quicktrade-fsca-aml-fine-south-africa-710000-rand`
- `saxo-bank-aml-fine-denmark-dkk-313-million-finanstilsynet`
- `fxopen-au-asic-licence-cancellation-human-resources`
- `prospero-markets-asic-licence-cancellation-money-laundering`
- `xtrade-fca-licence-cancellation-vulnerable-clients-cfds`
- `ic-markets-eu-cysec-fine-margin-circumvention-retail-cfds`
- `trive-asic-licence-cancellation-cfd-deficiencies`
- `ironfx-notesco-cysec-settlement-cfd-marketing`
- `forex-com-nfa-fine-account-adjustments-platform-glitch`
- `forex-ct-asic-20-million-penalty-unconscionable-conduct`
- `oanda-cftc-fine-net-capital-dividends`
- `etoro-sec-settlement-unregistered-crypto-broker`
- `fxcm-cftc-fine-no-dealing-desk-fraud-us-exit`
- `alvexo-operator-cysec-settlement-licence-withdrawal`
- `infinox-fca-fine-mifir-transaction-reporting-failure`
- `ic-markets-948-million-class-action-federal-court-australia`
- `celsius-network-cftc-enforcement-report-2026`
- `binance-australia-asic-10-million-penalty-retail-classification`
- `darren-reynolds-fca-ban-british-steel-pension`
- `myforexfunds-cftc-fraud-20-billion-freeze`
- `canaccord-genuity-fincen-80-million-bsa-penalty`
- `pictet-overseas-finra-aml-warning-ignored`
- `blue-ocean-ats-finra-aml-overnight-trading`
- `falconx-cftc-fine-unregistered-futures-commission-merchant`
- `bluesky-wealth-frank-breuer-lifetime-ban-pension-fraud`
- `dinosaur-merchant-bank-fca-fine-cfd-surveillance-failure`
- `etoro-ai-agents-grok-autopilot-trading`
- `ig-trade-responsibly-3000-free-shares-incentive`
- `pepperstone-awards-vs-complaints-offshore-entity`
- `plus500-prediction-markets-gamble-regulation`
- `fxcm-stratos-jefferies-sale-long-fall`
- `saxo-bank-42m-aml-fine-premium-myth`
- `plus500-buyback-binge-capital-strength-or-illusion`

### Source attribution

Articles without any visible source attribution (0):

- None

Articles without linked primary source URLs (18):

- `xtrend-speed-unverified-license-withdrawal-complaints`
- `long-asia-mas-regulation-claim-withdrawal-complaints`
- `warren-bowie-smith-scam-reports-withdrawal`
- `headway-complaints-zeroed-balances-withdrawals`
- `alpari-withdrawal-blocked-complaints`
- `binomo-blocked-account-withdrawal-complaints`
- `pocket-option-no-license-blocked-accounts`
- `blue-ocean-ats-finra-aml-overnight-trading`
- `falconx-cftc-fine-unregistered-futures-commission-merchant`
- `bluesky-wealth-frank-breuer-lifetime-ban-pension-fraud`
- `dinosaur-merchant-bank-fca-fine-cfd-surveillance-failure`
- `etoro-ai-agents-grok-autopilot-trading`
- `ig-trade-responsibly-3000-free-shares-incentive`
- `pepperstone-awards-vs-complaints-offshore-entity`
- `plus500-prediction-markets-gamble-regulation`
- `fxcm-stratos-jefferies-sale-long-fall`
- `saxo-bank-42m-aml-fine-premium-myth`
- `plus500-buyback-binge-capital-strength-or-illusion`

## Validation notes

- Live articles were expected to return HTTP 200; future articles were expected to return HTTP 404.
- Live route HTML was checked for an exact title/H1 match, canonical URL, visible publication date/time, editorial NewsArticle schema type, author URL, publisher, image, and main entity.
- Every live article was checked for a crawlable link from the paginated 'news' archive; future articles were checked for premature archive links.
- The news sitemap was checked for the Google namespace, publication name, publication dates, and the 1,000-entry limit.
- Remote covers were checked with HTTP HEAD and local covers with filesystem existence checks.
- Neon inventory/status could not be included because the project returned HTTP 402 for data-transfer quota. This report therefore verifies the canonical static archive and date gate, not DB row status.
- Trustpilot and similar third-party source URLs may reject automated requests; source-link availability is separate from article route/image validity.

## Review priority

1. Fix any future route/image/required-field or discovery faults if they appear after rerun.
2. Review the 79 short articles first, especially live articles.
3. Add direct source URLs to the 18 articles that have attribution but no linked primary source.
4. Normalize metadata lengths and declared word counts.
5. Re-run after Neon quota recovery to compare static articles against DB status.
