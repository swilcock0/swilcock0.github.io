---
name: update-publications
description: Sync the /publications/ page (_data/publications.yml) with Files/CV.pdf and the Arch // Struct Lab site. Use when the CV has been updated (a "Update CV from <sha>" commit, or the user says the CV changed), when a paper is accepted, published or moves out of "In press", or when the user asks to check the publications list for anything missing.
---

# Update publications

The page `publications.html` renders `_data/publications.yml`, grouped by year in file order. The home page shows the first three entries, so they should be published work, not in-press items. There are two kinds of entry:

- **Lab entries** have an `id`: the slug of a file in `_publications/` on the lab site (`archstructlab/archstructlab.github.io`). The id builds the title link (`https://archstructlab.com/publications/<id>`) and the PDF/BibTeX links (`https://archstructlab.com/download/pubs/<id>.pdf|.bib`). The PDFs and BibTeX files stay on the lab site; never copy them into this repo.
- **CV-only entries** have no `id`. They come from `Files/CV.pdf`: in-press work, preprints, the PhD thesis, patents. Their title links to `doi`, else `url`, else nothing.

## Fields

```yaml
- id: 26-fiducial-marker-fusion   # lab slug; omit if the lab has no page for it
  year: 2026
  title: Fusion of fiducial marker and point cloud data for ...
  authors: Sam Wilcock and Ornella Iuorio   # "A, B and C", full names, as in the CV
  venue: Construction Robotics              # journal, proceedings or book title
  doi: 10.1007/s41693-026-00183-3           # bare DOI, no https://doi.org/
  url: https://...                          # only when there is no DOI
  note: In press                            # optional: In press, Preprint, PhD thesis, Patent application, pending
  pdf: true                                 # lab entries only: does download/pubs/<id>.pdf exist on the lab site
  bib: true                                 # lab entries only: does download/pubs/<id>.bib exist
  posts: [/posts/2025-04-09-Arlecchino/]    # optional: blog posts about this work; linked both ways
```

Keep existing `posts:` lists when re-syncing an entry; they are hand-curated and not in the CV or on the lab site.
The authors string also feeds the /publications/ JSON-LD, so keep it as "A, B and C" with full names.

## Steps

1. **Get the latest CV.** A GitHub Actions bot in another repo pushes `Files/CV.pdf`, so run `git pull` first.

2. **Extract the CV's publications.**
   ```bash
   pdftotext -layout Files/CV.pdf - | sed -n '/^[[:space:]]*Publications[[:space:]]*$/,$p'
   ```
   (`[[:space:]]` rather than a plain space because a page break puts a form feed before the heading.)
   Sections: Journal articles, Book chapters, Peer-reviewed conference articles, Patents, PhD thesis. PDF line wrapping splits DOIs (`doi: 10.` / `1201/...`) and adds stray `→` link glyphs, so rejoin DOIs before comparing.

3. **List the lab's publications by Sam**, and which PDF/BibTeX files exist:
   ```bash
   R=repos/archstructlab/archstructlab.github.io
   gh api "$R/git/trees/main?recursive=1" --jq '.tree[].path' > /tmp/lab_tree.txt
   for f in $(grep '^_publications/.*\.md$' /tmp/lab_tree.txt); do
     gh api "$R/contents/$f" --jq .content | base64 -d | grep -qi wilcock && echo "$f"
   done
   ```
   For each match, read the front matter (`title`, `authors`, `publication`, `year`, `doi`) with `gh api "$R/contents/<file>" --jq .content | base64 -d`.

4. **Compare against `_data/publications.yml`.** Match on DOI first, then on the title (lower-cased, ignoring punctuation). The CV and the lab can phrase titles and venues slightly differently; that alone doesn't make it a new paper.
   - **In the CV, not in the file:** add it.
   - **Now on the lab site:** add its `id` and set `pdf`/`bib` from `/tmp/lab_tree.txt`.
   - **Out of press:** remove `note: In press`, and add the DOI and final venue.
   - **Missing DOI:** fill it from the CV or the lab.
   - **In the file, not in the CV:** don't delete it. Ask the user.

5. **Order.** Newest year first. Within a year, published work comes first and in-press, preprint, thesis and patent entries after it. Keep the comment header at the top of the file.

6. **Verify.**
   ```bash
   bundle exec jekyll build
   grep -c 'class="pub"' _site/publications/index.html        # one per entry
   ```
   Check every new link: `curl -sL -o /dev/null -w '%{http_code}' <url>` should give 200 for lab pages and PDF/BibTeX files. DOI links may answer 403 to curl from publisher sites; that's fine as long as `https://doi.org/api/handles/<doi>` returns 200. Then look at `/publications/` and the "Latest publications" block on the home page.

7. **Report** what was added, changed or left alone, and anything that needs the user: titles that don't match, papers the CV doesn't list, missing DOIs. Don't commit unless the user asks.
