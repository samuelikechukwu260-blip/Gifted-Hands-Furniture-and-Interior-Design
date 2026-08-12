import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const PUBLIC = path.join(ROOT, "public");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY GitHub secrets.",
  );
}

const FUNCTIONS_URL =
  `${SUPABASE_URL}/functions/v1`;

async function fetchFunction(functionName, body) {
  const response = await fetch(
    `${FUNCTIONS_URL}/${functionName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `${functionName} failed: ${response.status} ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true });

  const entries = await fs.readdir(source, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absoluteUrl(pathname) {
  const base =
    process.env.SITE_URL ||
    "https://www.giftedhandsfurniture.com";

  return `${base.replace(/\/$/, "")}/${pathname.replace(/^\//, "")}`;
}

function buildGalleryCard(item) {
  return `
    <article class="gallery-card">
      <a href="/gallery-${escapeHtml(item.slug)}.html">
        <img
          src="${escapeHtml(item.image_url)}"
          alt="${escapeHtml(item.alt_text)}"
          loading="lazy"
          decoding="async"
        >
        <div class="gallery-card-content">
          <span>${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.title)}</h3>
        </div>
      </a>
    </article>
  `;
}

function buildBlogCard(post) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString(
        "en-NG",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      )
    : "";

  return `
    <article class="blog-card">
      ${
        post.featured_image
          ? `
            <a href="/blog-${escapeHtml(post.slug)}.html">
              <img
                src="${escapeHtml(post.featured_image)}"
                alt="${escapeHtml(post.image_alt || post.title)}"
                loading="lazy"
                decoding="async"
              >
            </a>
          `
          : ""
      }

      <div class="blog-card-content">
        <time datetime="${escapeHtml(post.published_at || "")}">
          ${escapeHtml(date)}
        </time>

        <h3>
          <a href="/blog-${escapeHtml(post.slug)}.html">
            ${escapeHtml(post.title)}
          </a>
        </h3>

        ${
          post.excerpt
            ? `<p>${escapeHtml(post.excerpt)}</p>`
            : ""
        }
      </div>
    </article>
  `;
}

function galleryPageTemplate(items) {
  const cards = items
    .map(buildGalleryCard)
    .join("\n");

  return `
<!DOCTYPE html>
<html lang="en-NG">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Furniture & Interior Design Gallery | Gifted Hands</title>

  <meta
    name="description"
    content="Explore furniture and interior design work by Gifted Hands Furniture and Interior Design."
  >

  <link
    rel="canonical"
    href="${absoluteUrl("gallery.html")}"
  >

  <meta
    property="og:title"
    content="Furniture & Interior Design Gallery | Gifted Hands"
  >

  <meta
    property="og:description"
    content="Explore our furniture and interior design work."
  >

  <meta
    property="og:type"
    content="website"
  >

  <meta
    property="og:url"
    content="${absoluteUrl("gallery.html")}"
  >

  <link rel="stylesheet" href="/css/style.css">
</head>

<body>

  <header id="site-header">
    <!-- Main navigation will be added to the frontend template. -->
  </header>

  <main>

    <section class="page-hero">
      <div class="container">
        <p class="eyebrow">Our Work</p>

        <h1>
          Furniture & Interior Design Gallery
        </h1>

        <p>
          Explore selected furniture and interior design work
          by Gifted Hands.
        </p>
      </div>
    </section>

    <section class="gallery-section">
      <div class="container">

        <div class="gallery-grid">
          ${cards}
        </div>

      </div>
    </section>

  </main>

  <footer id="site-footer"></footer>

  <script src="/js/main.js" defer></script>

</body>
</html>
`;
}

function galleryDetailTemplate(item) {
  const title = escapeHtml(item.title);

  const description = item.description
    ? `<p>${escapeHtml(item.description)}</p>`
    : "";

  const canonical =
    absoluteUrl(`gallery-${item.slug}.html`);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: item.title,
    description: item.description || undefined,
    contentUrl: item.image_url,
    url: canonical,
  });

  return `
<!DOCTYPE html>
<html lang="en-NG">
<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>
    ${title} | Gifted Hands Furniture & Interior Design
  </title>

  <meta
    name="description"
    content="${escapeHtml(
      item.description ||
      `${item.title} by Gifted Hands Furniture and Interior Design.`,
    )}"
  >

  <link
    rel="canonical"
    href="${canonical}"
  >

  <meta
    property="og:title"
    content="${title} | Gifted Hands"
  >

  <meta
    property="og:description"
    content="${escapeHtml(
      item.description || item.alt_text,
    )}"
  >

  <meta
    property="og:type"
    content="article"
  >

  <meta
    property="og:image"
    content="${escapeHtml(item.image_url)}"
  >

  <meta
    property="og:url"
    content="${canonical}"
  >

  <link rel="stylesheet" href="/css/style.css">

  <script type="application/ld+json">
    ${jsonLd}
  </script>

</head>

<body>

  <header id="site-header"></header>

  <main>

    <article class="gallery-detail">

      <div class="container">

        <p class="eyebrow">
          ${escapeHtml(item.category)}
        </p>

        <h1>${title}</h1>

        <figure>
          <img
            src="${escapeHtml(item.image_url)}"
            alt="${escapeHtml(item.alt_text)}"
          >
        </figure>

        <div class="gallery-description">
          ${description}
        </div>

      </div>

    </article>

  </main>

  <footer id="site-footer"></footer>

  <script src="/js/main.js" defer></script>

</body>
</html>
`;
}

function blogPageTemplate(posts) {
  const cards = posts
    .map(buildBlogCard)
    .join("\n");

  return `
<!DOCTYPE html>
<html lang="en-NG">
<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>
    Furniture & Interior Design Blog | Gifted Hands
  </title>

  <meta
    name="description"
    content="Furniture, interior design, home improvement and furniture care articles from Gifted Hands."
  >

  <link
    rel="canonical"
    href="${absoluteUrl("blog.html")}"
  >

  <meta
    property="og:title"
    content="Furniture & Interior Design Blog | Gifted Hands"
  >

  <meta
    property="og:type"
    content="website"
  >

  <meta
    property="og:url"
    content="${absoluteUrl("blog.html")}"
  >

  <link rel="stylesheet" href="/css/style.css">

</head>

<body>

  <header id="site-header"></header>

  <main>

    <section class="page-hero">
      <div class="container">

        <p class="eyebrow">Journal</p>

        <h1>
          Furniture & Interior Design Blog
        </h1>

        <p>
          Helpful ideas, inspiration and advice from
          Gifted Hands.
        </p>

      </div>
    </section>

    <section class="blog-section">

      <div class="container">

        <div class="blog-grid">
          ${cards}
        </div>

      </div>

    </section>

  </main>

  <footer id="site-footer"></footer>

  <script src="/js/main.js" defer></script>

</body>
</html>
`;
}

function blogDetailTemplate(post) {
  const title = escapeHtml(post.title);

  const canonical =
    absoluteUrl(`blog-${post.slug}.html`);

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString(
        "en-NG",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      )
    : "";

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description:
      post.seo_description ||
      post.excerpt ||
      "",
    image: post.featured_image
      ? [post.featured_image]
      : undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || undefined,
    mainEntityOfPage: canonical,
    author: {
      "@type": "Organization",
      name:
        "Gifted Hands Furniture and Interior Design",
    },
  });

  return `
<!DOCTYPE html>
<html lang="en-NG">
<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>
    ${escapeHtml(
      post.seo_title ||
      `${post.title} | Gifted Hands`,
    )}
  </title>

  <meta
    name="description"
    content="${escapeHtml(
      post.seo_description ||
      post.excerpt ||
      "",
    )}"
  >

  <link
    rel="canonical"
    href="${canonical}"
  >

  <meta
    property="og:title"
    content="${title}"
  >

  <meta
    property="og:description"
    content="${escapeHtml(
      post.seo_description ||
      post.excerpt ||
      "",
    )}"
  >

  <meta
    property="og:type"
    content="article"
  >

  <meta
    property="og:url"
    content="${canonical}"
  >

  ${
    post.featured_image
      ? `
        <meta
          property="og:image"
          content="${escapeHtml(post.featured_image)}"
        >
      `
      : ""
  }

  <link rel="stylesheet" href="/css/style.css">

  <script type="application/ld+json">
    ${jsonLd}
  </script>

</head>

<body>

  <header id="site-header"></header>

  <main>

    <article class="blog-detail">

      <div class="container">

        <header class="article-header">

          <p class="eyebrow">
            Gifted Hands Journal
          </p>

          <h1>${title}</h1>

          ${
            date
              ? `<time datetime="${escapeHtml(
                  post.published_at,
                )}">${escapeHtml(date)}</time>`
              : ""
          }

        </header>

        ${
          post.featured_image
            ? `
              <figure class="article-image">
                <img
                  src="${escapeHtml(post.featured_image)}"
                  alt="${escapeHtml(
                    post.image_alt ||
                    post.title,
                  )}"
                >
              </figure>
            `
            : ""
        }

        ${
          post.excerpt
            ? `
              <p class="article-excerpt">
                ${escapeHtml(post.excerpt)}
              </p>
            `
            : ""
        }

        <div class="article-content">
          ${post.content}
        </div>

      </div>

    </article>

  </main>

  <footer id="site-footer"></footer>

  <script src="/js/main.js" defer></script>

</body>
</html>
`;
}

async function writeFile(filePath, content) {
  await fs.mkdir(
    path.dirname(filePath),
    { recursive: true },
  );

  await fs.writeFile(
    filePath,
    content,
    "utf8",
  );
}

async function build() {
  console.log("Building Gifted Hands website...");

  await fs.rm(PUBLIC, {
    recursive: true,
    force: true,
  });

  await fs.mkdir(PUBLIC, {
    recursive: true,
  });

  /*
   * Copy static frontend files.
   */
  const pagesDir = path.join(SRC, "pages");
  const cssDir = path.join(SRC, "css");
  const jsDir = path.join(SRC, "js");
  const assetsDir = path.join(SRC, "assets");

  await copyDirectory(
    cssDir,
    path.join(PUBLIC, "css"),
  );

  await copyDirectory(
    jsDir,
    path.join(PUBLIC, "js"),
  );

  try {
    await copyDirectory(
      assetsDir,
      path.join(PUBLIC, "assets"),
    );
  } catch {
    console.log("No assets directory found.");
  }

  /*
   * Copy static HTML pages.
   */
  const pageFiles = await fs.readdir(
    pagesDir,
  );

  for (const file of pageFiles) {
    if (!file.endsWith(".html")) {
      continue;
    }

    await fs.copyFile(
      path.join(pagesDir, file),
      path.join(PUBLIC, file),
    );
  }

  /*
   * Retrieve dynamic content.
   */
  console.log("Fetching gallery...");

  const galleryResponse =
    await fetchFunction(
      "get-gallery",
      {
        limit: 100,
      },
    );

  const gallery =
    galleryResponse.gallery || [];

  console.log(
    `Gallery items: ${gallery.length}`,
  );

  console.log("Fetching blog posts...");

  const blogResponse =
    await fetchFunction(
      "get-blog",
      {
        limit: 100,
      },
    );

  const posts =
    blogResponse.posts || [];

  console.log(
    `Blog posts: ${posts.length}`,
  );

  /*
   * Generate gallery listing.
   */
  await writeFile(
    path.join(PUBLIC, "gallery.html"),
    galleryPageTemplate(gallery),
  );

  /*
   * Generate individual gallery pages.
   */
  for (const item of gallery) {
    await writeFile(
      path.join(
        PUBLIC,
        `gallery-${item.slug}.html`,
      ),
      galleryDetailTemplate(item),
    );
  }

  /*
   * Generate blog listing.
   */
  await writeFile(
    path.join(PUBLIC, "blog.html"),
    blogPageTemplate(posts),
  );

  /*
   * Generate individual blog pages.
   */
  for (const post of posts) {
    await writeFile(
      path.join(
        PUBLIC,
        `blog-${post.slug}.html`,
      ),
      blogDetailTemplate(post),
    );
  }

  console.log(
    "Gifted Hands website build completed.",
  );
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
