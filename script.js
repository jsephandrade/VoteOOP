// script.js
// Handles all fetch calls & DOM updates for index.html.

document.addEventListener("DOMContentLoaded", () => {
  const apiHost = window.location.hostname || "127.0.0.1";
  const API_BASE =
    window.location.port === "3000" ? "" : `http://${apiHost}:3000`;
  const api = (path) => `${API_BASE}${path}`;
  const statusClasses = {
    success: "status status-success",
    error: "status status-error",
    info: "status status-info",
  };

  const setStatus = (el, message, type = "info") => {
    el.textContent = message;
    el.className = statusClasses[type] || statusClasses.info;
    el.classList.remove("hidden");
  };

  const clearStatus = (el) => {
    el.textContent = "";
    el.className = statusClasses.info;
    el.classList.add("hidden");
  };

  const disableField = (el) => {
    el.disabled = true;
    el.classList.add("is-disabled");
  };

  const disableButton = (el) => {
    el.disabled = true;
    el.classList.add("is-disabled");
  };

  const renderListMessage = (container, message) => {
    const li = document.createElement("li");
    li.className = "list-item";
    const span = document.createElement("span");
    span.className = "list-meta";
    span.textContent = message;
    li.appendChild(span);
    container.appendChild(li);
  };

  // SECTION 1: Register as Voter
  const btnRegisterVoter = document.getElementById("btn-register-voter");
  const vrNameInput = document.getElementById("vr-name");
  const vrNidInput = document.getElementById("vr-nid");
  const vrDobInput = document.getElementById("vr-dob");
  const vrResult = document.getElementById("vr-result");

  btnRegisterVoter.addEventListener("click", async () => {
    clearStatus(vrResult);
    const name = vrNameInput.value.trim();
    const nationalId = vrNidInput.value.trim();
    const dob = vrDobInput.value; // YYYY-MM-DD
    if (!name || !nationalId || !dob) {
      setStatus(vrResult, "All fields are required.", "error");
      return;
    }

    try {
      const res = await fetch(api("/api/voter/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nationalId, dateOfBirth: dob }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(
          vrResult,
          `Registered! Your Voter ID: ${data.voterId}`,
          "success"
        );

        vrNameInput.value = "";
        vrNameInput.setAttribute("placeholder", "");
        disableField(vrNameInput);

        vrNidInput.value = "";
        vrNidInput.setAttribute("placeholder", "");
        disableField(vrNidInput);

        vrDobInput.value = "";
        vrDobInput.setAttribute("placeholder", "");
        disableField(vrDobInput);

        disableButton(btnRegisterVoter);
      } else {
        setStatus(vrResult, data.error || "Registration failed.", "error");
      }
    } catch (err) {
      setStatus(vrResult, "Network error.", "error");
    }
  });

  // SECTION 2: Load Ongoing Elections
  const btnLoadElections = document.getElementById("btn-load-elections");
  const electionsContainer = document.getElementById("elections-container");
  btnLoadElections.addEventListener("click", async () => {
    electionsContainer.innerHTML = "";
    try {
      const res = await fetch(api("/api/elections/ongoing"));
      const list = await res.json();
      if (Array.isArray(list) && list.length) {
        list.forEach((el) => {
          const li = document.createElement("li");
          li.className = "list-item";
          li.innerHTML = `
            <div>
              <p class="list-title">${el.name}</p>
              <p class="list-meta">
                ID: ${el.electionId} | Closes: ${new Date(el.endDate).toLocaleString()}
              </p>
            </div>
            <button data-eid="${el.electionId}" class="enroll-btn mini-btn">
              Enroll ->
            </button>
          `;
          electionsContainer.appendChild(li);
        });

        document.querySelectorAll(".enroll-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const eid = btn.dataset.eid;
            showVoteSection(eid);
          });
        });
      } else {
        renderListMessage(electionsContainer, "No ongoing elections.");
      }
    } catch (err) {
      electionsContainer.innerHTML = "";
      renderListMessage(electionsContainer, "Failed to load elections.");
    }
  });

  function showVoteSection(electionId) {
    const voteSection = document.getElementById("vote-section");
    voteSection.dataset.eid = electionId;
    voteSection.classList.remove("hidden");
    voteSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // SECTION 3: Fetch Election Details (Candidates)
  const btnFetchDetails = document.getElementById("btn-fetch-election-details");
  const voterIdInput = document.getElementById("voter-id-input");
  const electionDetails = document.getElementById("election-details");
  const edName = document.getElementById("ed-name");
  const edId = document.getElementById("ed-id");
  const candidateList = document.getElementById("candidate-list");
  const voteResult = document.getElementById("vote-result");

  btnFetchDetails.addEventListener("click", async () => {
    clearStatus(voteResult);
    candidateList.innerHTML = "";
    electionDetails.classList.add("hidden");

    const eid = document.getElementById("vote-section").dataset.eid;
    const voterId = voterIdInput.value.trim();
    if (!voterId) {
      setStatus(voteResult, "Enter your Voter ID first.", "error");
      return;
    }

    try {
      const regRes = await fetch(api(`/api/election/${eid}/register`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        setStatus(voteResult, regData.error || "Registration failed.", "error");
        return;
      }
    } catch (err) {
      setStatus(voteResult, "Network error during registration.", "error");
      return;
    }

    try {
      const res = await fetch(api(`/api/election/${eid}/candidates`));
      const arr = await res.json();
      if (!res.ok) {
        setStatus(voteResult, arr.error || "Failed to load candidates.", "error");
        return;
      }

      edName.textContent = arr.length ? `${arr[0].electionName || "Election"}` : "Election";
      edId.textContent = eid;
      electionDetails.classList.remove("hidden");

      arr.forEach((c) => {
        const li = document.createElement("li");
        li.className = "list-item";
        li.innerHTML = `
          <label>
            <input type="radio" name="candidate" value="${c.candidateId}" />
            <span>${c.name} (${c.party})</span>
          </label>
        `;
        candidateList.appendChild(li);
      });
    } catch (err) {
      setStatus(voteResult, "Failed to load candidates.", "error");
    }
  });

  // SECTION 3.3: Cast Vote
  const btnCastVote = document.getElementById("btn-cast-vote");
  btnCastVote.addEventListener("click", async () => {
    clearStatus(voteResult);
    const eid = document.getElementById("vote-section").dataset.eid;
    const voterId = voterIdInput.value.trim();
    const selected = document.querySelector('input[name="candidate"]:checked');
    if (!selected) {
      setStatus(voteResult, "Select a candidate first.", "error");
      return;
    }
    const candidateId = selected.value;

    try {
      const res = await fetch(api(`/api/election/${eid}/vote`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId, candidateId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(voteResult, "Vote successfully cast!", "success");

        voterIdInput.value = "";
        voterIdInput.setAttribute("placeholder", "");
        disableField(voterIdInput);

        disableButton(btnFetchDetails);
        candidateList.innerHTML = "";
        disableButton(btnCastVote);
      } else {
        setStatus(voteResult, data.error || "Vote failed.", "error");
      }
    } catch (err) {
      setStatus(voteResult, "Network error during voting.", "error");
    }
  });

  // SECTION 4: Admin Tools (Close & View Results)
  const btnCloseElection = document.getElementById("btn-close-election");
  const btnViewResults = document.getElementById("btn-view-results");
  const adminPwdInput = document.getElementById("admin-password");
  const adminEidInput = document.getElementById("admin-election-id");
  const adminStatus = document.getElementById("admin-status");
  const resultsContainer = document.getElementById("results-container");
  let adminToken = null;

  adminPwdInput.addEventListener("input", () => {
    adminToken = null;
  });

  const getAdminToken = async () => {
    if (adminToken) return adminToken;
    const password = adminPwdInput.value;
    if (!password) {
      throw new Error("Admin password required.");
    }
    const res = await fetch(api("/api/admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Admin login failed.");
    }
    adminToken = data.token;
    return adminToken;
  };

  btnCloseElection.addEventListener("click", async () => {
    resultsContainer.innerHTML = "";
    clearStatus(adminStatus);
    const password = adminPwdInput.value;
    const electionId = adminEidInput.value.trim();
    if (!password || !electionId) {
      setStatus(adminStatus, "Admin password and Election ID required.", "error");
      return;
    }
    try {
      setStatus(adminStatus, "Authorizing admin access...", "info");
      const token = await getAdminToken();
      setStatus(adminStatus, "Closing election...", "info");
      const res = await fetch(api(`/api/election/${electionId}/close`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(adminStatus, "Election closed successfully.", "success");
      } else {
        if (res.status === 401 || res.status === 403) {
          adminToken = null;
        }
        setStatus(adminStatus, data.error || "Close election failed.", "error");
      }
    } catch (err) {
      adminToken = null;
      setStatus(adminStatus, err.message || "Network error while closing.", "error");
    }
  });

  btnViewResults.addEventListener("click", async () => {
    resultsContainer.innerHTML = "";
    clearStatus(adminStatus);
    const electionId = adminEidInput.value.trim();
    if (!electionId) {
      setStatus(adminStatus, "Enter an Election ID first.", "error");
      return;
    }
    try {
      const res = await fetch(api(`/api/election/${electionId}/results`));
      const data = await res.json();
      if (!res.ok) {
        renderListMessage(resultsContainer, data.error || "Failed to load results.");
        return;
      }
      if (!Array.isArray(data) || !data.length) {
        renderListMessage(resultsContainer, "No votes cast yet (or no candidates).");
        return;
      }
      data.forEach((r) => {
        const li = document.createElement("li");
        li.className = "result-row";
        li.innerHTML = `
          <span>${r.name} (${r.party})</span>
          <strong class="result-count">${r.votes} votes</strong>
        `;
        resultsContainer.appendChild(li);
      });
    } catch (err) {
      renderListMessage(resultsContainer, "Network error.");
    }
  });
});
