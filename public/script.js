// public/script.js
// ──────────────────────────────────────────────────────────────────────────
// Handles all fetch calls & DOM updates for index.html.
// ──────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // SECTION 1: Register as Voter
  const btnRegisterVoter = document.getElementById("btn-register-voter");
  const vrName       = document.getElementById("vr-name");
  const vrNid        = document.getElementById("vr-nid");
  const vrDob        = document.getElementById("vr-dob");
  const vrResult     = document.getElementById("vr-result");

  btnRegisterVoter.addEventListener("click", async () => {
    vrResult.textContent = "";
    const name = vrName.value.trim();
    const nationalId = vrNid.value.trim();
    const dob = vrDob.value; // YYYY-MM-DD
    if (!name || !nationalId || !dob) {
      vrResult.textContent = "All fields are required.";
      vrResult.className = "text-red-600";
      return;
    }

    try {
      const res = await fetch("/api/voter/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nationalId, dateOfBirth: dob }),
      });
      const data = await res.json();
      if (res.ok) {
        // ────────────────────────────────────────────────
        // 1) Show success message
        vrResult.textContent = `Registered! Your Voter ID: ${data.voterId}`;
        vrResult.className   = "text-green-700 break-words";

        // 2) Clear and disable each registration input
        vrNameInput.value = "";
        vrNameInput.setAttribute("placeholder", "");
        vrNameInput.disabled = true;
        vrNameInput.classList.add("opacity-50", "cursor-not-allowed");

        vrNidInput.value = "";
        vrNidInput.setAttribute("placeholder", "");
        vrNidInput.disabled = true;
        vrNidInput.classList.add("opacity-50", "cursor-not-allowed");

        vrDobInput.value = "";
        vrDobInput.setAttribute("placeholder", "");
        vrDobInput.disabled = true;
        vrDobInput.classList.add("opacity-50", "cursor-not-allowed");

        // 3) Disable the Register button itself
        btnRegisterVoter.disabled = true;
        btnRegisterVoter.classList.add("opacity-50", "cursor-not-allowed");

        // 4) (Optional) Hide the entire “Register as Voter” section
        // If you prefer to remove the registration form entirely, uncomment:
        // document.getElementById("voter-registration").classList.add("hidden");
        // ────────────────────────────────────────────────
      } else {
        // Backend returned an error (e.g. invalid ID format or under-18)
        vrResult.textContent = `Error: ${data.error}`;
        vrResult.className = "text-red-600";
      }
    } catch (err) {
      vrResult.textContent = "Network error.";
      vrResult.className = "text-red-600";
    }
  });

  // SECTION 2: Load Ongoing Elections
  const btnLoadElections = document.getElementById("btn-load-elections");
  const electionsContainer = document.getElementById("elections-container");
  btnLoadElections.addEventListener("click", async () => {
    electionsContainer.innerHTML = "";
    try {
      const res = await fetch("/api/elections/ongoing");
      const list = await res.json();
      if (Array.isArray(list) && list.length) {
        list.forEach((el) => {
          const li = document.createElement("li");
          li.className = "flex justify-between items-center border-b pb-2";
          li.innerHTML = `
            <div>
              <p class="font-medium">${el.name}</p>
              <p class="text-sm text-gray-600">
                ID: ${el.electionId} | Closes: ${new Date(el.endDate).toLocaleString()}
              </p>
            </div>
            <button data-eid="${el.electionId}" class="enroll-btn bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
              Enroll ▶
            </button>
          `;
          electionsContainer.appendChild(li);
        });

        // Attach click listeners to each “Enroll” button
        document.querySelectorAll(".enroll-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const eid = btn.dataset.eid;
            showVoteSection(eid);
          });
        });
      } else {
        const li = document.createElement("li");
        li.textContent = "No ongoing elections.";
        li.className = "text-gray-700";
        electionsContainer.appendChild(li);
      }
    } catch (err) {
      electionsContainer.textContent = "Failed to load elections.";
      electionsContainer.className = "text-red-600";
    }
  });

  // Show the Enroll & Vote section for a chosen election
  function showVoteSection(electionId) {
    const voteSection = document.getElementById("vote-section");
    voteSection.dataset.eid = electionId;
    voteSection.classList.remove("hidden");
    // Collapse election list UI so user focuses on voting
    // (optional UX)
  }

  // SECTION 3: Fetch Election Details (Candidates)
  const btnFetchDetails = document.getElementById("btn-fetch-election-details");
  const voterIdInput = document.getElementById("voter-id-input");
  const electionDetails = document.getElementById("election-details");
  const edName       = document.getElementById("ed-name");
  const edId         = document.getElementById("ed-id");
  const candidateList = document.getElementById("candidate-list");
  const voteResult   = document.getElementById("vote-result");

  btnFetchDetails.addEventListener("click", async () => {
    voteResult.textContent = "";
    candidateList.innerHTML = "";
    electionDetails.classList.add("hidden");

    const eid = document.getElementById("vote-section").dataset.eid;
    const voterId = voterIdInput.value.trim();
    if (!voterId) {
      voteResult.textContent = "Enter your Voter ID first.";
      voteResult.className = "text-red-600";
      return;
    }

    // 3.1 Register the voter for that election (so they are eligible)
    try {
      const regRes = await fetch(`/api/election/${eid}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        voteResult.textContent = `Registration Error: ${regData.error}`;
        voteResult.className = "text-red-600";
        return;
      }
    } catch (err) {
      voteResult.textContent = "Network error during registration.";
      voteResult.className = "text-red-600";
      return;
    }

    // 3.2 Fetch election’s candidate list
    try {
      const res = await fetch(`/api/election/${eid}/candidates`);
      const arr = await res.json();
      if (!res.ok) {
        voteResult.textContent = `Error: ${arr.error}`;
        voteResult.className = "text-red-600";
        return;
      }

      // Display election info + candidates
      edName.textContent = arr.length ? `${arr[0].electionName || "Election"}` : "Election";
      edId.textContent = eid;
      electionDetails.classList.remove("hidden");

      arr.forEach((c) => {
        const li = document.createElement("li");
        li.className = "flex items-center space-x-2";
        li.innerHTML = `
          <label class="flex items-center space-x-2">
            <input type="radio" name="candidate" value="${c.candidateId}" class="h-4 w-4" />
            <span>${c.name} (${c.party})</span>
          </label>
        `;
        candidateList.appendChild(li);
      });
    } catch (err) {
      voteResult.textContent = "Failed to load candidates.";
      voteResult.className = "text-red-600";
    }
  });

  // SECTION 3.3: Cast Vote
  const btnCastVote = document.getElementById("btn-cast-vote");
  btnCastVote.addEventListener("click", async () => {
  voteResult.textContent = "";
  const eid     = document.getElementById("vote-section").dataset.eid;
  const voterId = voterIdInput.value.trim();
  const selected = document.querySelector('input[name="candidate"]:checked');
  if (!selected) {
    voteResult.textContent = "Select a candidate first.";
    voteResult.className = "text-red-600";
    return;
  }
  const candidateId = selected.value;

  try {
    const res  = await fetch(`/api/election/${eid}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId, candidateId }),
    });
    const data = await res.json();
    if (res.ok) {
      // ─────────────────────────────────────────
      // 1) Show success message
      voteResult.textContent = "✅ Vote successfully cast!";
      voteResult.className   = "text-green-700";

      // 2) Clear & disable the Voter ID field
      voterIdInput.value = "";
      voterIdInput.setAttribute("placeholder", "");
      voterIdInput.disabled = true;
      voterIdInput.classList.add("opacity-50");

      // 3) Disable the “Fetch Election Details” button
      btnFetchDetails.disabled = true;
      btnFetchDetails.classList.add("opacity-50", "cursor-not-allowed");

      // 4) Clear or hide candidate list completely
      candidateList.innerHTML = "";
      // (Alternate: disable each radio instead of wiping HTML)
      // document.querySelectorAll('input[name="candidate"]').forEach(r => r.disabled = true);

      // 5) Disable the “Cast Vote” button
      btnCastVote.disabled = true;
      btnCastVote.classList.add("opacity-50", "cursor-not-allowed");

      // 6) (Optional) Hide entire voting section
      // document.getElementById("vote-section").classList.add("hidden");

      // 7) (Optional) Shift focus back to another section or clear focus
      // btnLoadElections.focus();
      // ─────────────────────────────────────────
    } else {
      voteResult.textContent = `Error: ${data.error}`;
      voteResult.className = "text-red-600";
    }
  } catch (err) {
    voteResult.textContent = "Network error during voting.";
    voteResult.className = "text-red-600";
  }
});

  // SECTION 4: Admin Tools (Close & View Results)
  const btnCloseElection = document.getElementById("btn-close-election");
  const btnViewResults   = document.getElementById("btn-view-results");
  const adminPwdInput    = document.getElementById("admin-password");
  const adminEidInput    = document.getElementById("admin-election-id");
  const resultsContainer = document.getElementById("results-container");

  btnCloseElection.addEventListener("click", async () => {
    resultsContainer.innerHTML = "";
    const password  = adminPwdInput.value;
    const electionId = adminEidInput.value.trim();
    if (!password || !electionId) {
      alert("Admin Password & Election ID required.");
      return;
    }
    try {
      const res = await fetch(`/api/election/${electionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Election closed successfully.");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Network error while closing.");
    }
  });

  btnViewResults.addEventListener("click", async () => {
    resultsContainer.innerHTML = "";
    const electionId = adminEidInput.value.trim();
    if (!electionId) {
      alert("Enter Election ID first.");
      return;
    }
    try {
      const res = await fetch(`/api/election/${electionId}/results`);
      const data = await res.json();
      if (!res.ok) {
        resultsContainer.innerHTML = `<li class="text-red-600">${data.error}</li>`;
        return;
      }
      if (!Array.isArray(data) || !data.length) {
        resultsContainer.innerHTML = `<li>No votes cast yet (or no candidates).</li>`;
        return;
      }
      data.forEach((r) => {
        const li = document.createElement("li");
        li.className = "flex justify-between bg-gray-100 p-2 rounded";
        li.innerHTML = `
          <span>${r.name} (${r.party})</span>
          <strong>${r.votes} votes</strong>
        `;
        resultsContainer.appendChild(li);
      });
    } catch (err) {
      resultsContainer.innerHTML = `<li class="text-red-600">Network error.</li>`;
    }
  });
});
