# civicenia.github.io

## Hosting the Site Locally

### Installing the site

You'll need [git](https://git-scm.com/downloads) and [Bun](https://bun.sh/).

- Clone the repo: `git clone https://github.com/CivIcenia/civicenia.github.io.git IceniaGov`

- Change directories into the cloned repo: `cd IceniaGov`

- Install the site's dependencies: `bun install`

### Loading the Site
  - Run `bun admin.ts`
  - Open http://localhost:4000, you should see the website

There is a script called `admin.ts`, which runs [Astro](https://docs.astro.build/en/getting-started/) in development mode and start a [NetlifyCMS](https://v1.netlifycms.org/) proxy in local editing mode. You can access the NetlifyCMS dashboard by going to http://localhost:4000/admin/index.html, or by clicking the "Admin" navigation link on the site.

## Updating the Site

You either locally host and edit the site, or use the DecapCMS dashboard.

**New Change:** https://civicenia.github.io/admin now hosts a DecapCMS edit page! Any edits made here will become pull requests on the website repo which can be approved by repo maintainers.

The DecapCMS dashboard is extremely helpful when entering new bills, laws, and official changes. DO NOT REMOVE REPEALED LAWS! Just toggle the "EXPIRED" switch in the dashboard, so all legal text can be archived.

## Saving in the Dashboard

Once you've finished editing something in the dashboard, you should see in the top left **Unsaved Changes**, and to the right of that is a button labelled **Publish**. Click that and choose the **Publish now** option. This will save your changes to the disk, or the repo directly.

If the option doesn't exist, click the **Save** button to the right of the top left "UNSAVED CHANGES". Then go back by clicking on the top left box with the arrow, and go to **Workflow** on the top left bar, and click onto your new change under **Drafts**. Then, click on the **Status** dropdown on the top left to the right of the **Save** button, and click on **Ready**, or **In Review** if **Ready** is not an option.

If **Ready** is an option, you can then click on **Publish** and **Publish now** to publish to the site.

If you clicked on **In Review** instead, this means you do not have edit permissions on the repo. Your "In Review" drafts are now stored on the repo as Pull Requests. Ask a repo maintainer to review and approve your changes.

## Particulars

- Laws:
  - YOU NEED TO ADD THE LAW BEFORE YOU CAN POST THE BILL THAT ENACTED THE LAW!
  - Open http://localhost:4000/admin/index.html
  - Click "Data" in the sidebar.
  - Click "Laws", this should bring up a page with all laws ordered from oldest to newest.
  - Click "Add law +"
  - Scroll down to the new form.
  - Follow the instructions.

- Bills:
  - Run `admin.ts`
  - Open http://localhost:4000/admin/index.html
  - Click "Changes to Law" in the sidebar.
  - Click "New Change to Law"
  - For the "INSTITUTION":
    - **Senate**: if it's a Senate Bill.
    - **Executive**: if it's a decree or statutory-instrument (like Article 1 of the Hansard Act)
    - **Referendum**: if it's the result of a referendum.
    - **Signatures of Icenians**: for ratifying new constitutions.
  - For the "TITLE":
    - Passed Bills should be formatted as "Passing the Example Bill" (it should always be Bill, not Act)
    - If it's a treaty, it should be "Signing the Example Treaty"
    - If it's an Amendment, it should be "Passing the Nth Amendment to the Constitution"
    - If it's a Bill that also includes an Amendment, it should be "Passing the Example Bill (+ Nth Amendment)"
  - Short and concise Bills should be recorded in Markdown:
    - Scroll to the "HOW ARE YOU EMBEDDING THIS?" section
    - For the "TYPE", select "Markdown"
    - Write/paste the raw markdown into the "VALUE"
  - Longer Bills, or Bills that include media (like images), should be included as PDFs:
    - Export the Bill as-is to a PDF (make sure it has no header or footer clutter)
      - If it's a Google Doc:
        - Ensure that you're on the `/edit` version of the URL
        - Do `File -> Download -> PDF Document (.pdf)`
    - Generate a random UUIDv4 from https://www.uuidgenerator.net/ or `crypto.randomUUID()`
    - Rename the PDF to that UUIDv4 (eg: `648f32f8-b3cb-4cdc-98e5-8adef925ebf7.pdf`)
    - Move the PDF to `/public/archive/`
    - Scroll to the "HOW ARE YOU EMBEDDING THIS?" section.
    - For the "TYPE", select "Local File"
    - Paste your PDF's name prefixed by `/archive/` (eg: `/archive/648f32f8-b3cb-4cdc-98e5-8adef925ebf7.pdf`)


- Government Official Changes (Senate Elections, Secretary Changes, etc.):
  - Run `admin.ts`
  - Open http://localhost:4000/admin/index.html
  - Click "Government Official Changes" in the sidebar.
  - Click "New Government Official Change"
  - For "TYPE OF CHANGE", select the appropriate type:
    - **Senate Election (Full)**: Full Senate election with all seats
    - **Senate By-Election (Certain Seats)**: Filling specific vacant seats
    - **Change in Secretary**: Appointment or resignation of a Secretary
    - **Vote for Speaker of the Senate**: Election of Speaker
    - **Change in President**: Presidential succession
  - For "OFFICIALS INVOLVED":
    - Add each official affected by the change
    - For Senators, **ALWAYS include a seat number (1-7)**
    - Include Discord Icon URL (from https://toolscord.com/ or https://discord.id/) for automatic sync
  - **Automatic Sync**: The `sync-officials.ts` script runs at build time and automatically updates `src/data/officials.yml` with the latest officials from these posts

- City Official Changes (Council Elections, Mayor Votes, etc.):
  - Run `admin.ts`
  - Open http://localhost:4000/admin/index.html
  - Click "City Official Changes" in the sidebar.
  - Click "New City Official Change"
  - For "TYPE OF CHANGE", select the appropriate type:
    - **Council Election (Full)**: Full Council election
    - **Council By-Election (Certain Seats)**: Filling specific vacant seats
    - **Mayor Voting**: Election of Mayor
  - For "OFFICIALS INVOLVED":
    - Add each official affected by the change
    - For Councillors, **ALWAYS include a seat number (1-5)**
    - Include Discord Icon URL for automatic sync
  - **Automatic Sync**: The `sync-officials.ts` script runs at build time and automatically updates `src/data/councillors.yml`

- How Officials Sync Works:
  - The `sync-officials.ts` script reads all Government/City Official Changes posts
  - It extracts the latest holder for each role based on post dates
  - Officials with resignation/removal actions clear their positions
  - The script updates `officials.yml` and `councillors.yml` automatically
  - **IMPORTANT**: For Senators/Councillors, always include seat numbers or they won't sync
  - Run manually with `bun run sync-officials.ts` for local testing
  - The script runs automatically during `bun run build`


- Border Polygons:
  - Run `admin.ts`
  - Open `/src/pages/government/borders.json.ts` in your IDE.
  - Open http://localhost:4000/government/map in your browser.
  - Ensure the "Icenian Territory" collection is toggled on.
  - Keep in mind that the `borders.json.ts` is the source of truth. If you update the polygon on the map and then refresh, it'll just revert to what the `borders.json.ts` says.
    - Updating polygons:
      - The map interface sadly has no way to export individual polygons; it'll instead export a whole feature like ALL of Bloom.
      - For the sake of guidance, let's say you've edited a Bloomean polygon.
      - In `borders.json.ts` each polygon is labelled. Did you edit Bloom proper, Cane Corp, etc?
      - For the sake of guidance, let's say you've edited the "Petrichor (City Exclave)" polygon, which is the 4th polygon, remember that.
      - Copy the exported JSON (from the map interface) into the left-side of https://jsonformatter.org/json-pretty-print
      - You should notice the `name` and `id` values in the JSON. You've effectively got the whole block of JSON, this means you need to extract the modified polygon.
      - Keep the spacing to "2 Tab Space", then click "Make Pretty"
      - On the right side, underneath the "o" in "polygon" will be a `[`. On that line, next to the line-number, should be a triangular down-arrow. Click that.
      - That whole polygon should now be collapsed to look like `[↔],`
      - Since "Petrichor (City Exclave)" is the 4th polygon, we need to do this another 3 times.
      - The right side should now look like:
        ```json
        {
          "name": "Bloom (Icenia)",
          "id": "087ac1aa-2c98-4496-8ed7-ccbe2050c25b",
          "polygon": [
            [↔],
            [↔],
            [↔],
            [↔]
          ],
          "notes": "The Viceroyalty of Bloom became a State of Icenia on 27th June 2022. Petrichor merged into Bloom on 19th March 2023.",
          "nation": "Republic of Icenia",
          "website": "http://localhost:4000",
          "color": "#00C9FF",
          "collectionId": "civmc/icenia/territory"
        }
        ```
      - Select the 4th `[↔]` (ensure there's no `,` at the end since it's the last polygon and JSON doesn't allow trailing commas) and copy.
      - Then select the whole "Petrichor (City Exclave)" labelled polygon in `borders.json.ts` and then paste, it should now be replaced with the updated polygon, not with `[↔]`.
      - If you have a modern IDE, that line should now be tagged blue somehow to indicate an edited line.
      - Save.
      - Refresh the map.
      - The map should now have the updated polygon.
    - Adding polygons:
      - The map interface sadly has no way to add polygons to an existing feature, so we have to do this manually.
      - Draw a new polygon on the map, then paste the exported JSON into the left side of https://jsonformatter.org/json-pretty-print
      - Follow the instructions in the relevant section of the `Updating polygons` guide until you have `[↔]` copied.
      - Paste the `[↔]` into the end of the "polygon" array of the feature (Icenia, Bloom, Icarus, etc) you want to add the polygon to.
      - Make sure the label the added polygon something obvious so that others (and your future self) knows what that polygon is.
      - Save.
      - Refresh the map.
      - The polygon should now be part of that feature, though it may be hidden beneath the original polygon you drew.


- Officials:
  - **NOTE:** Officials are now managed automatically through Official Change posts (see above)
  - The officials pages (`government/officials` and `icenia-city/council`) read from YAML data files
  - These YAML files are automatically updated by `sync-officials.ts` at build time
  - You can still manually edit `src/data/officials.yml` and `src/data/councillors.yml` if needed
  - Use https://toolscord.com/ or https://discord.id/ to get Discord profile pictures


- Publishing
  - Always do `bun run build` before committing and pushing.
  - The site should automatically republish itself anytime you push to master.
  - If something goes wrong on Github's end, and you need to attempt a republish, do:
    - Click the "Actions" tab above (assuming you're on this repo's Github page)
    - Click the "IceniaGov Site Build" workflow in the left sidebar.
    - Click the "Run workflow" dropdown.
    - Ensure the "Branch" dropdown has the master branch selected.
    - Click the "Run workflow" button.
    - This will manually republish the site regardless of git activity.


- Styling
  - This site uses the GOVUK template.
  - You should consult [this](https://design-system.service.gov.uk/get-started/) if you intend to add new things to the site.
  - The "Components" tab is particularly useful. All of its components have a "HTML" source option, which you can copy as-is onto the site.