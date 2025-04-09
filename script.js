document.addEventListener("DOMContentLoaded", () => {
  const logBox = document.getElementById("logBox");

  document.getElementById("deployBtn").addEventListener("click", async () => {
    const repoLink = document.getElementById("repoLink").value.trim();
    const githubToken = document.getElementById("githubToken").value.trim();

    if (!repoLink || !githubToken) {
      logBox.textContent = "Repo link සහ GitHub token එක දෙකම අවශ්‍යයි!";
      return;
    }

    const match = repoLink.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      logBox.textContent = "Repo link එක වැරදියි!";
      return;
    }

    const [_, owner, repo] = match;
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
    const branch = "main";

    logBox.textContent = "Loading settings.js from repo...";

    // 1. Read settings.js file content
    const res = await fetch(`${apiBase}/contents/settings.js?ref=${branch}`, {
      headers: {
        Authorization: `token ${githubToken}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      logBox.textContent = `settings.js file එක load කරන්න බැරිවුණා:\n${errText}`;
      return;
    }

    const fileData = await res.json();
    const content = atob(fileData.content);

    // 2. Modify content: insert values at comment locations
    const updatedContent = content
      .replace(/\/\/\s*put your seasen id.*/i, `const seasonId = "SEASON123"; // auto-filled`)
      .replace(/\/\/\s*owner nomber.*/i, `const ownerNumber = "94712345678"; // auto-filled`);

    logBox.textContent = "Updating settings.js with season ID and owner number...";

    // 3. Update settings.js back to GitHub
    const updateRes = await fetch(`${apiBase}/contents/settings.js`, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Auto-filled season ID and owner number",
        content: btoa(updatedContent),
        sha: fileData.sha,
        branch: branch
      })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      logBox.textContent = `settings.js update එක fail වුණා:\n${errText}`;
      return;
    }

    // 4. Trigger deploy action
    logBox.textContent = "Triggering GitHub Action...";

    const dispatchRes = await fetch(`${apiBase}/actions/workflows/deploy.yml/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ref: branch,
        inputs: {
          season_id: "SEASON123"
        }
      })
    });

    if (dispatchRes.status === 204) {
      const actionUrl = `https://github.com/${owner}/${repo}/actions`;
      logBox.innerHTML = `✅ Deploy Triggered Successfully!\n\n◈ Repo: ${repoLink}\n◈ GitHub Actions: ${actionUrl}`;
    } else {
      const errText = await dispatchRes.text();
      logBox.textContent = `❌ Deploy trigger fail:\n${errText}`;
    }
  });
});
