/**
 * index.js
 * Demo / simple CLI simulation for the Online Voting System.
 *
 * To run, open a terminal at "C:\VoteOOP - Online Voting System" and type:
 *    node index.js
 */

const VotingSystem = require("./models/VotingSystem"); // correct relative path

// 1) Instantiate the voting system with an admin password
const vs = new VotingSystem("supersecret");

// 2) Register two system voters (will throw if nationalId invalid or < 18)
let voterAlice, voterBob;
try {
  voterAlice = vs.registerSystemVoter("Alice Johnson", "ABC12345", new Date("1990-04-12"));
  voterBob   = vs.registerSystemVoter("Bob Martinez",   "XYZ67890", new Date("1985-09-30"));
} catch (err) {
  console.error("Error registering voter:", err.message);
}

// 3) Register two system candidates
const candJane = vs.registerSystemCandidate("Jane Perez", "Blue Party");
const candJohn = vs.registerSystemCandidate("John Santos", "Green Party");

// 4) Admin creates a new election (throws if password wrong or ID exists)
try {
  vs.createElection(
    "election2025",
    "2025 Presidential Race",
    new Date("2025-06-01T00:00:00Z"),
    new Date("2025-06-07T23:59:59Z"),
    "supersecret"
  );
} catch (err) {
  console.error("Error creating election:", err.message);
}

// 5) Admin adds candidates to the election (throws if wrong password / not found)
try {
  vs.addCandidateToElection("election2025", candJane.candidateId, "supersecret");
  vs.addCandidateToElection("election2025", candJohn.candidateId, "supersecret");
} catch (err) {
  console.error("Error adding candidate:", err.message);
}

// 6) Register voters for the election (throws if voter or election not found / closed)
try {
  vs.registerVoterForElection(voterAlice.voterId, "election2025");
  vs.registerVoterForElection(voterBob.voterId,   "election2025");
} catch (err) {
  console.error("Error registering voter to election:", err.message);
}

// 7) Simulate the election window being open. For demo, assume it's within the date.
//    (In a real system, you must wait until system date ∈ [startDate, endDate].)

// 8) Each voter casts their vote (throws on invalid conditions)
try {
  vs.castSystemBallot(voterAlice.voterId, "election2025", candJane.candidateId);
  vs.castSystemBallot(voterBob.voterId,   "election2025", candJohn.candidateId);
} catch (err) {
  console.error("Error casting ballot:", err.message);
}

// 9) Admin closes the election (throws if wrong password or election not found)
try {
  vs.closeElection("election2025", "supersecret");
} catch (err) {
  console.error("Error closing election:", err.message);
}

// 10) Fetch and display results (throws if election not closed / not found)
try {
  const results = vs.getElectionResults("election2025");
  console.log("Final Tally for 2025 Presidential Race:");
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.name} (${r.party}) – ${r.votes} vote(s)`);
  });
} catch (err) {
  console.error("Error getting results:", err.message);
}
