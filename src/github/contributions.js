const LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

function emptyDay(date, count = 0) {
  return {
    date,
    count,
    level: count === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil(count / 3))),
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function syntheticCalendar(login) {
  const rand = mulberry32(hashString(login || "commit-breaker"));
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 365);
  while (start.getUTCDay() !== 0) start.setUTCDate(start.getUTCDate() - 1);

  const weeks = [];
  const cursor = new Date(start);
  let total = 0;
  while (cursor <= today) {
    const days = [];
    for (let i = 0; i < 7; i += 1) {
      const date = cursor.toISOString().slice(0, 10);
      const active = rand() > 0.42;
      const count = active ? Math.floor(rand() * 12) + 1 : 0;
      total += count;
      days.push(emptyDay(date, count));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push({ days });
  }
  return {
    login,
    source: "synthetic",
    total,
    weeks,
  };
}

function asWeeksFromDays(days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ days: days.slice(i, i + 7) });
  }
  return weeks;
}

async function githubFetch(url, token, body) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "commit-breaker",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.message || payload.errors?.[0]?.message || response.statusText;
    throw new Error(`GitHub API ${response.status}: ${message}`);
  }
  return payload;
}

export async function fetchUserCalendar(login, token) {
  const query = `
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                contributionLevel
                date
              }
            }
          }
        }
      }
    }
  `;
  const payload = await githubFetch("https://api.github.com/graphql", token, {
    query,
    variables: { login },
  });
  const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new Error(`Nao achei o calendario de ${login}.`);
  }
  return {
    login,
    source: "user",
    total: calendar.totalContributions,
    weeks: calendar.weeks.map((week) => ({
      days: week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
        level: LEVELS[day.contributionLevel] ?? 0,
      })),
    })),
  };
}

export async function fetchRepoCalendar(repository, token) {
  const [owner, name] = repository.split("/");
  if (!owner || !name) {
    throw new Error('repository deve ser "owner/name".');
  }
  const stats = await githubFetch(
    `https://api.github.com/repos/${owner}/${name}/stats/commit_activity`,
    token,
  );
  if (!Array.isArray(stats) || stats.length === 0) {
    throw new Error(`Sem estatistica de commits para ${repository} ainda (o GitHub cacheia isso).`);
  }
  const days = [];
  let total = 0;
  for (const week of stats) {
    const start = new Date(week.week * 1000);
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      const count = week.days?.[i] || 0;
      total += count;
      days.push(emptyDay(date.toISOString().slice(0, 10), count));
    }
  }
  return {
    login: repository,
    source: "repo",
    total,
    weeks: asWeeksFromDays(days),
  };
}

export async function loadCalendar({ login, token, source, repository }) {
  try {
    if (source === "repo") {
      return await fetchRepoCalendar(repository || login, token);
    }
    if (!token) {
      return syntheticCalendar(login);
    }
    return await fetchUserCalendar(login, token);
  } catch (error) {
    const fallback = syntheticCalendar(login);
    fallback.warning = String(error.message || error);
    return fallback;
  }
}
