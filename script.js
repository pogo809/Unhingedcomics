const OWNER = "pogo809";
const REPO = "Unhingedcomics";
const BRANCH = "main";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/`;
const COMMITS_API = `https://api.github.com/repos/${OWNER}/${REPO}/commits`;
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
const PROGRESS_KEY = "uc-progress";
const THEME_KEY = "uc-theme";

function prettyName(value) {
  return String(value || "").replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function readerUrl(comic, chapter, page = 1) {
  return `reader.html?comic=${encodeURIComponent(comic)}&chapter=${encodeURIComponent(chapter)}&page=${page}`;
}

async function apiContents(path) {
  const r = await fetch(API + path, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store"
  });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  return r.json();
}

async function getCommits(path) {
  const url = `${COMMITS_API}?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(BRANCH)}&per_page=10`;
  const r = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store"
  });
  if (!r.ok) return [];
  return r.json();
}

async function discoverComics() {
  const root = await apiContents("comics");
  const result = [];

  for (const comicDir of root.filter(x => x.type === "dir")) {
    const chaptersRaw = await apiContents(`comics/${encodeURIComponent(comicDir.name)}`);
    const chapters = [];

    for (const chapterDir of chaptersRaw.filter(x => x.type === "dir")) {
      const path = `comics/${comicDir.name}/${chapterDir.name}`;
      const files = await apiContents(path);

      const pages = files
        .filter(x => x.type === "file" && /\.(webp|jpg|jpeg|png)$/i.test(x.name))
        .sort((a, b) => {
          const na = parseInt((a.name.match(/\d+/) || ["0"])[0], 10);
          const nb = parseInt((b.name.match(/\d+/) || ["0"])[0], 10);
          return na - nb || a.name.localeCompare(b.name);
        });

      if (!pages.length) continue;

      let updatedAt = 0;
      const commits = await getCommits(path);
      if (commits.length) {
        updatedAt = Math.max(...commits.map(c =>
          Date.parse(c.commit?.committer?.date || c.commit?.author?.date || c.commit?.committer?.date || "") || 0
        ));
      }

      chapters.push({
        name: chapterDir.name,
        pages,
        path,
        updatedAt
      });
    }

    if (chapters.length) {
      result.push({ name: comicDir.name, chapters });
    }
  }

  return result;
}

function chapterCard(comic, chapter) {
  const first = chapter.pages[0];
  const image = RAW + `comics/${encodeURIComponent(comic.name)}/${encodeURIComponent(chapter.name)}/${encodeURIComponent(first.name)}`;
  return `
    <a class="comic-card" href="${readerUrl(comic.name, chapter.name)}">
      <img src="${image}" alt="${prettyName(comic.name)} ${prettyName(chapter.name)}" loading="lazy">
      <div class="card-body">
        <h3>${prettyName(comic.name)}</h3>
        <p>${prettyName(chapter.name)}</p>
      </div>
    </a>`;
}

function continueCard(progress, chapter) {
  const pageIndex = Math.max(1, Math.min(Number(progress.page) || 1, chapter.pages.length));
  const file = chapter.pages[pageIndex - 1];
  const image = RAW + `comics/${encodeURIComponent(progress.comic)}/${encodeURIComponent(progress.chapter)}/${encodeURIComponent(file.name)}`;
  const percent = Math.round((pageIndex / chapter.pages.length) * 100);

  return `
    <a class="continue-card" href="${readerUrl(progress.comic, progress.chapter, pageIndex)}">
      <img src="${image}" alt="Last page read" loading="lazy">
      <div class="continue-info">
        <span>Continue Reading</span>
        <h3>${prettyName(progress.comic)}</h3>
        <p>${prettyName(progress.chapter)} · Page ${pageIndex} of ${chapter.pages.length}</p>
        <div class="progress-bar"><i style="width:${percent}%"></i></div>
        <b>Resume →</b>
      </div>
    </a>`;
}

function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.dataset.theme = saved;

  const button = document.querySelector("#theme-toggle");
  if (!button) return;

  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
  });
}

async function initHome() {
  setupTheme();

  const allEl = document.querySelector("#all-comics");
  const newEl = document.querySelector("#new-comics");
  const continueEl = document.querySelector("#continue-reading");
  if (!allEl) return;

  try {
    const comics = await discoverComics();

    const chapters = [];
    for (const comic of comics) {
      for (const chapter of comic.chapters) {
        chapters.push({ comic, chapter });
      }
    }

    // Sort by actual GitHub commit time. Items without commit metadata go last.
    const newest = [...chapters].sort(
      (a, b) => (b.chapter.updatedAt || 0) - (a.chapter.updatedAt || 0)
    );

    allEl.innerHTML = chapters.length
      ? chapters.map(x => chapterCard(x.comic, x.chapter)).join("")
      : "<p>No comics found yet.</p>";

    if (newEl) {
      newEl.innerHTML = newest.slice(0, 4).map(x => chapterCard(x.comic, x.chapter)).join("")
        || "<p>No new chapters found yet.</p>";
    }

    if (continueEl) {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        try {
          const progress = JSON.parse(saved);
          const match = chapters.find(x =>
            x.comic.name === progress.comic && x.chapter.name === progress.chapter
          );
          continueEl.innerHTML = match
            ? continueCard(progress, match.chapter)
            : "<p>No reading history yet.</p>";
        } catch {
          continueEl.innerHTML = "<p>No reading history yet.</p>";
        }
      } else {
        continueEl.innerHTML = "<p>No reading history yet.</p>";
      }
    }
  } catch (err) {
    console.error(err);
    allEl.innerHTML = "<p>Could not load comics right now. Please refresh.</p>";
    if (newEl) newEl.innerHTML = "<p>Could not load new chapters right now.</p>";
  }
}

document.addEventListener("DOMContentLoaded", initHome);
