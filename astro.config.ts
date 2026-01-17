import { defineConfig } from "astro/config";
import yaml from "@rollup/plugin-yaml";

// https://astro.build/config
export default defineConfig({
    // When hosting as a GitHub Pages project site under
    // `https://<username>.github.io/<repo>/` set `site`
    // and `base` accordingly so generated links and redirects are
    // rooted at the repository path.
    site: "https://civicenia.github.io",
    base: "/",  // have this as "/" if hosting as a user/organization site
    trailingSlash: "ignore",

    build: {
        assets: 'astro', // Changes output from '_astro' to 'astro'
    },

    server: {
        port: 4000,
    },

    vite: {
        plugins: [
            yaml()
        ],
        build: {
            // Increase chunk size warning limit
            chunkSizeWarningLimit: 2000,
        }
    },

    redirects: {
        // Old Jekyll page redirects
        "/2022-06-20/constitution-ratified": "${BASE}news/2022-06-20-constitution-ratified",
        "/2022-06-23/senate-election": "${BASE}news/2022-06-23-senate-election",
        "/2022-06-27/approving-statehood-for-bloom": "${BASE}news/2022-06-27-approving-statehood-for-bloom",
        "/2022-06-30/establishing-a-procedure-of-agendas-for-future-icenian-growth": "${BASE}news/2022-06-30-establishing-a-procedure-of-agendas-for-future-icenian-growth",
        "/2022-06-30/improving-accountability-for-government-decisions-and-officials": "${BASE}news/2022-06-30-improving-accountability-for-government-decisions-and-officials",
        "/2022-06-30/signing-the-mutual-defense-and-support-coalition-charter": "${BASE}news/2022-06-30-signing-the-mutual-defense-and-support-coalition-charter",
        "/2022-07-02/passing-the-icenian-namelayer-bill": "${BASE}news/2022-07-02-passing-the-icenian-namelayer-bill",
        "/2022-07-02/passing-the-judicial-reform-amendment-of-july-2022": "${BASE}news/2022-07-02-passing-the-judicial-reform-amendment-of-july-2022",
        "/2022-07-05/approving-statehood-for-temporal-isles": "${BASE}news/2022-07-05-approving-statehood-for-temporal-isles",
        "/2022-07-08/expanding-states-rights": "${BASE}news/2022-07-08-expanding-states-rights",
        "/2022-07-22/signing-the-pact-of-friendship-and-mututal-economic-benefit-with-titan": "${BASE}news/2022-07-22-signing-the-pact-of-friendship-and-mututal-economic-benefit-with-titan",
        "/2022-07-24/passing-the-states-judicial-discretion-amendment-of-july-2022": "${BASE}news/2022-07-24-passing-the-states-judicial-discretion-amendment-of-july-2022",
        "/2022-08-01/senate-election": "${BASE}news/2022-08-01-senate-election",
        "/2022-08-11/passing-the-formatting-of-dates-act": "${BASE}news/2022-08-11-passing-the-formatting-of-dates-act",
        "/2022-08-13/passing-the-judicial-systems-reformation-amendment": "${BASE}news/2022-08-13-passing-the-judicial-systems-reformation-amendment",
        "/2022-08-17/passing-the-kallos-mututal-defence-pact": "${BASE}news/2022-08-17-passing-the-kallos-mututal-defence-pact",
        "/2022-08-19/approving-statehood-for-petrichor": "${BASE}news/2022-08-19-approving-statehood-for-petrichor",
        "/2022-08-19/passing-the-icenian-identity-and-security-amendment": "${BASE}news/2022-08-19-passing-the-icenian-identity-and-security-amendment",
        "/2022-09-02/senate-election": "${BASE}news/2022-09-02-senate-election",
        "/2022-09-20/signing-the-security-enhancement-coalition-treaty": "${BASE}news/2022-09-20-signing-the-security-enhancement-coalition-treaty",
        "/2022-09-27/signing-the-treaty-for-temporal-independence": "${BASE}news/2022-09-27-signing-the-treaty-for-temporal-independence",
        "/2022-10-03/senate-election": "${BASE}news/2022-10-03-senate-election",
        "/2022-10-11/passing-the-fifth-amendment-to-the-constitution": "${BASE}news/2022-10-11-passing-the-fifth-amendment-to-the-constitution",
        "/2022-10-21/passing-the-statute-of-territory": "${BASE}news/2022-10-21-passing-the-statute-of-territory",
        "/2022-10-26/passing-the-sixth-amendment-to-the-constitution": "${BASE}news/2022-10-26-passing-the-sixth-amendment-to-the-constitution",
        "/2022-10-30/passing-the-seventh-amendment-to-the-constitution": "${BASE}news/2022-10-30-passing-the-seventh-amendment-to-the-constitution",
        "/2022-11-02/senate-election": "${BASE}news/2022-11-02-senate-election",
        "/2022-11-16/passing-the-hansard-act": "${BASE}news/2022-11-16-passing-the-hansard-act",
        "/2022-11-16/retiring-the-treaty-with-titan": "${BASE}news/2022-11-16-retiring-the-treaty-with-titan",
        "/2022-11-22/repealing-agendas-for-future-growth": "${BASE}news/2022-11-22-repealing-agendas-for-future-growth",
        "/2022-12-05/senate-election": "${BASE}news/2022-12-05-senate-election",
        "/2022-12-09/signing-the-temporal-vault-treaty": "${BASE}news/2022-12-09-signing-the-temporal-vault-treaty",
        "/2022-12-14/passing-the-iceniar-claims-bill": "${BASE}news/2022-12-14-passing-the-iceniar-claims-bill",
        "/2023-01-03/passing-the-butternut-portal-agreement": "${BASE}news/2023-01-03-passing-the-butternut-portal-agreement",
        "/2023-01-08/senate-election": "${BASE}news/2023-01-08-senate-election",
        "/2023-02-05/senate-election": "${BASE}news/2023-02-05-senate-election",
        "/2023-02-09/repeal-kallos-treaty": "${BASE}news/2023-02-09-repeal-kallos-treaty",
        "/2023-02-15/icarus-defence-pact": "${BASE}news/2023-02-15-icarus-defence-pact",
        "/2023-03-04/senate-election": "${BASE}news/2023-03-04-senate-election",
        "/2023-03-07/nullifying-temporal-treaties": "${BASE}news/2023-03-07-nullifying-temporal-treaties",
        "/2023-03-08/passing-the-icenia-claims-update-bill": "${BASE}news/2023-03-08-passing-the-icenia-claims-update-bill",
        "/2023-03-10/passing-building-regulations": "${BASE}news/2023-03-10-passing-building-regulations",
        "/2023-03-10/passing-the-eighth-amendment-to-the-constitution": "${BASE}news/2023-03-10-passing-the-eighth-amendment-to-the-constitution",
        "/2023-03-10/passing-the-protection-of-life-bill": "${BASE}news/2023-03-10-passing-the-protection-of-life-bill",
        "/2023-03-10/passing-the-safe-icenia-bill": "${BASE}news/2023-03-10-passing-the-safe-icenia-bill",
        "/2023-03-12/passing-the-icenian-snitch-bill": "${BASE}news/2023-03-12-passing-the-icenian-snitch-bill",
        "/2023-04-05/senate-election": "${BASE}news/2023-04-05-senate-election",
        "/2023-04-06/passing-the-regulation-of-treaties-bill": "${BASE}news/2023-04-06-passing-the-regulation-of-treaties-bill",
        "/2023-04-09/passing-the-ninth-amendment-to-the-constitution": "${BASE}news/2023-04-09-passing-the-ninth-amendment-to-the-constitution",
        "/2023-04-14/passing-the-legislative-slimming-bill": "${BASE}news/2023-04-14-passing-the-legislative-slimming-bill",
        "/2023-04-21/signing-the-dual-islands-treaty": "${BASE}news/2023-04-21-signing-the-dual-islands-treaty",
        "/2023-04-30/approving-statehood-for-southshire": "${BASE}news/2023-04-30-approving-statehood-for-southshire",
        "/2023-05-10/senate-election": "${BASE}news/2023-05-10-senate-election",
        "/2023-05-23/dissolving-statehood-of-petrichor": "${BASE}news/2023-05-23-dissolving-statehood-of-petrichor",
        "/2023-05-28/approving-statehood-for-tortugan": "${BASE}news/2023-05-28-approving-statehood-for-tortugan",
        "/2023-06-06/senate-election": "${BASE}news/2023-06-06-senate-election",
        "/2023-06-29/dissolving-statehood-of-tortugan": "${BASE}news/2023-06-29-dissolving-statehood-of-tortugan",
        "/2023-07-10/senate-election": "${BASE}news/2023-07-10-senate-election",
        "/2023-07-22/friendship-with-yoahtl": "${BASE}news/2023-07-22-friendship-with-yoahtl",
        "/2023-07-22/withdrawing-from-sec": "${BASE}news/2023-07-22-withdrawing-from-sec",
        "/2023-08-02/senate-election": "${BASE}news/2023-08-02-senate-election",
        "/2023-08-03/dawn-guard-pact-treaty": "${BASE}news/2023-08-03-dawn-guard-pact-treaty",
        "/2023-08-28/approving-statehood-for-icarus": "${BASE}news/2023-08-28-approving-statehood-for-icarus",
        "/2023-09-02/senate-election": "${BASE}news/2023-09-02-senate-election",
        "/2023-09-04/passing-the-icenia-build-back-better-bill": "${BASE}news/2023-09-04-passing-the-icenia-build-back-better-bill",
        "/2023-09-04/treasury-amendment": "${BASE}news/2023-09-04-treasury-amendment",
        "/2023-09-12/dereliction-amendment": "${BASE}news/2023-09-12-dereliction-amendment",
        "/2023-09-14/roles-granting-amendment": "${BASE}news/2023-09-14-roles-granting-amendment",
        "/2023-09-17/passing-the-icenia-bounty-hunting-bill": "${BASE}news/2023-09-17-passing-the-icenia-bounty-hunting-bill",
        "/2023-10-02/senate-election": "${BASE}news/2023-10-02-senate-election",
        "/2023-10-03/amending-building-regulations-act": "${BASE}news/2023-10-03-amending-building-regulations-act",
        "/2023-10-12/contracts-act": "${BASE}news/2023-10-12-contracts-act",
        "/2023-10-14/sovia-partition-treaty": "${BASE}news/2023-10-14-sovia-partition-treaty",
        "/2023-10-25/magistrate-amendment": "${BASE}news/2023-10-25-magistrate-amendment",
        "/2023-11-02/senate-election": "${BASE}news/2023-11-02-senate-election",
        "/2023-11-05/articles-of-war": "${BASE}news/2023-11-05-articles-of-war",
        "/2023-11-07/property-amendment": "${BASE}news/2023-11-07-property-amendment",
        "/2023-11-08/citizenship-suspension-act": "${BASE}news/2023-11-08-citizenship-suspension-act",
        "/2023-11-11/pavia-cub-treaty": "${BASE}news/2023-11-11-pavia-cub-treaty",
        "/2023-11-30/subsidized-housing-act": "${BASE}news/2023-11-30-subsidized-housing-act",
        "/2023-12-02/senate-election": "${BASE}news/2023-12-02-senate-election",
        "/2023-12-09/nullifing-the-butternut-portal-treaty": "${BASE}news/2023-12-09-nullifing-the-butternut-portal-treaty",
        "/2023-12-11/state-of-war-bill": "${BASE}news/2023-12-11-state-of-war-bill",
        "/2023-12-22/pnc-claims-bill": "${BASE}news/2023-12-22-pnc-claims-bill",
        "/2023-12-23/red-rocks-pact": "${BASE}news/2023-12-23-red-rocks-pact",
        "/2023-12-27/end-state-of-war-bill": "${BASE}news/2023-12-27-end-state-of-war-bill",
        "/2024-01-02/senate-election": "${BASE}news/2024-01-02-senate-election",
        "/2024-01-08/rivia-treaty": "${BASE}news/2024-01-08-rivia-treaty",

        // After running ./fix-dates.ts (4th July 2024)
        "/news/2024-03-05-joining-the-ascendancy": "${BASE}news/2024-02-06-joining-the-ascendancy",
        "/news/2024-03-13-amend-article-1-of-the-hansard-act": "${BASE}news/2024-03-06-amend-article-1-of-the-hansard-act",
        "/news/2024-03-13-repeal-the-gang-shi-band-act": "${BASE}news/2024-03-06-repeal-the-gang-shi-band-act",
        "/news/2024-02-03-trial-reform-amendment": "${BASE}news/2024-02-04-trial-reform-amendment",
        "/news/2024-03-22-passing-the-tribune-amendment": "${BASE}news/2024-03-17-passing-the-tribune-amendment",
        "/news/2024-06-25-passing-the-medal-and-awards-act": "${BASE}news/2024-05-23-passing-the-medal-and-awards-act",
        "/news/2024-04-05-non-aggression-pact-between-icenia-and-exyria": "${BASE}news/2024-03-19-non-aggression-pact-between-icenia-and-exyria",
        "/news/2024-03-13-repeal-pnc-pearls-act": "${BASE}news/2024-03-06-repeal-pnc-pearls-act",
        "/news/2023-12-09-nullifing-the-butternut-portal-treaty": "${BASE}news/2023-12-04-nullifing-the-butternut-portal-treaty",

        // Better slugs (4th July 2024)
        "/news/2024-03-19-non-aggression-pact-between-icenia-and-exyria": "${BASE}news/2024-03-19-signing-exyria-nap",

        // Whoops, copy paste error
        "/news/2024-07-18-passing-the-dereliction-2-amendment": "${BASE}news/2024-07-18-passing-judiciary-reform-amendment",

        // After running ./fix-dates.ts (7th Dec 2024)
        "/news/2024-11-06-senate-election": "${BASE}news/2024-11-02-senate-election",
        "/news/2024-11-06-passing-the-icenian-flag-bill": "${BASE}news/2024-07-12-passing-the-icenian-flag-bill",
        "/news/2024-09-23-senate-election": "${BASE}news/2024-09-02-senate-election",
        "/news/2024-10-02-senate-election": "${BASE}news/2024-10-01-senate-election",
    }
});
