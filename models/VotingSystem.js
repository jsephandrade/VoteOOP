/**
 * VotingSystem.js
 * Top-level orchestrator for multiple elections, voters, and candidates.
 */

const Voter = require("./Voter");         // relative path to Voter.js
const Candidate = require("./Candidate"); // relative path to Candidate.js
const Election = require("./Election");   // relative path to Election.js
const Ballot = require("./Ballot");       // relative path to Ballot.js

class VotingSystem {
  /**
   * @param {string} adminPassword - Hard-coded admin password for protected operations.
   */
  constructor(adminPassword) {
    // Map of all system voters: voterId => Voter instance
    this.voters = new Map();

    // Map of all system candidates: candidateId => Candidate instance
    this.candidates = new Map();

    // Map of all elections: electionId => Election instance
    this.elections = new Map();

    // Simple admin password check (for prototype purposes)
    this.adminPassword = adminPassword;
  }

  /**
   * registerSystemVoter(name, nationalId, dateOfBirth)
   *  - Creates a Voter, calls register(), and stores it in this.voters.
   *
   * @param {string} name
   * @param {string} nationalId
   * @param {Date}   dateOfBirth
   * @returns {Voter} The newly registered Voter instance.
   * @throws {Error} If underlying Voter.register() fails.
   */
  registerSystemVoter(name, nationalId, dateOfBirth) {
    // 1) Instantiate a new Voter
    const voter = new Voter(name, nationalId, dateOfBirth);

    // 2) Call register() to validate and generate voterId
    const voterId = voter.register(); // may throw if invalid

    // 3) Store in system map
    this.voters.set(voterId, voter);
    return voter;
  }

  /**
   * registerSystemCandidate(name, party)
   *  - Creates a Candidate and stores it in this.candidates.
   *
   * @param {string} name
   * @param {string} party
   * @returns {Candidate} The newly created Candidate instance.
   */
  registerSystemCandidate(name, party) {
    const candidate = new Candidate(name, party);
    this.candidates.set(candidate.candidateId, candidate);
    return candidate;
  }

  /**
   * createElection(electionId, name, startDate, endDate, password)
   *  - Admin-only: Creates a new Election instance and stores it.
   *
   * @param {string} electionId
   * @param {string} name
   * @param {Date}   startDate
   * @param {Date}   endDate
   * @param {string} password
   * @returns {Election} The newly created Election.
   * @throws {Error} If password incorrect or electionId already exists.
   */
  createElection(electionId, name, startDate, endDate, password) {
    if (password !== this.adminPassword) {
      throw new Error("Unauthorized: Invalid admin password.");
    }
    if (this.elections.has(electionId)) {
      throw new Error("Election ID already exists.");
    }
    const election = new Election(electionId, name, startDate, endDate);
    this.elections.set(electionId, election);
    return election;
  }

  /**
   * deleteElection(electionId, password)
   *  - Admin-only: Removes an election from the system.
   *
   * @param {string} electionId
   * @param {string} password
   * @returns {boolean} true if deleted.
   * @throws {Error} If password incorrect or election not found.
   */
  deleteElection(electionId, password) {
    if (password !== this.adminPassword) {
      throw new Error("Unauthorized: Invalid admin password.");
    }
    if (!this.elections.has(electionId)) {
      throw new Error("Election not found.");
    }
    this.elections.delete(electionId);
    return true;
  }

  /**
   * addCandidateToElection(electionId, candidateId, password)
   *  - Admin-only: Links a system Candidate to a given Election.
   *
   * @param {string} electionId
   * @param {string} candidateId
   * @param {string} password
   * @returns {boolean} true if added successfully.
   * @throws {Error} If invalid password, election, or candidate.
   */
  addCandidateToElection(electionId, candidateId, password) {
    if (password !== this.adminPassword) {
      throw new Error("Unauthorized: Invalid admin password.");
    }
    if (!this.elections.has(electionId)) {
      throw new Error(`Election ${electionId} not found.`);
    }
    if (!this.candidates.has(candidateId)) {
      throw new Error(`Candidate ${candidateId} not found.`);
    }
    const election = this.elections.get(electionId);
    const candidate = this.candidates.get(candidateId);
    return election.addCandidate(candidate);
  }

  /**
   * registerVoterForElection(voterId, electionId)
   *  - Enrolls an existing system voter into a particular election.
   *
   * @param {string} voterId
   * @param {string} electionId
   * @returns {boolean} true if registered successfully.
   * @throws {Error} If voter or election not found, or election closed.
   */
  registerVoterForElection(voterId, electionId) {
    if (!this.voters.has(voterId)) {
      throw new Error("Voter not found in system.");
    }
    if (!this.elections.has(electionId)) {
      throw new Error("Election not found.");
    }
    const voter = this.voters.get(voterId);
    const election = this.elections.get(electionId);
    return election.registerVoter(voter);
  }

  /**
   * castSystemBallot(voterId, electionId, candidateId)
   *  - High-level method to cast a vote: builds a Ballot and calls election.castBallot().
   *
   * @param {string} voterId
   * @param {string} electionId
   * @param {string} candidateId
   * @returns {boolean} true if vote recorded.
   * @throws {Error} If any underlying condition fails (not found or invalid).
   */
  castSystemBallot(voterId, electionId, candidateId) {
    // 1) Validate presence of all three objects
    if (!this.voters.has(voterId)) {
      throw new Error("Voter not found in system.");
    }
    if (!this.elections.has(electionId)) {
      throw new Error("Election not found.");
    }
    if (!this.candidates.has(candidateId)) {
      throw new Error("Candidate not found in system.");
    }

    // 2) Build the Ballot object
    const ballot = new Ballot(electionId, voterId, candidateId);

    // 3) Delegate to the Election instance
    const election = this.elections.get(electionId);
    return election.castBallot(ballot);
  }

  /**
   * closeElection(electionId, password)
   *  - Admin-only: Ends voting for the given election immediately.
   *
   * @param {string} electionId
   * @param {string} password
   * @returns {boolean} true if closed.
   * @throws {Error} If password invalid or election not found.
   */
  closeElection(electionId, password) {
    if (password !== this.adminPassword) {
      throw new Error("Unauthorized: Invalid admin password.");
    }
    if (!this.elections.has(electionId)) {
      throw new Error("Election not found.");
    }
    const election = this.elections.get(electionId);
    return election.closeElection();
  }

  /**
   * getElectionResults(electionId)
   *  - Returns sorted results for a closed election.
   *
   * @param {string} electionId
   * @returns {Array<{candidateId: string, name: string, party: string, votes: number}>}
   * @throws {Error} If election not found or not closed yet.
   */
  getElectionResults(electionId) {
    if (!this.elections.has(electionId)) {
      throw new Error("Election not found.");
    }
    const election = this.elections.get(electionId);
    if (!election.closed) {
      throw new Error("Election not yet closed.");
    }
    return election.getResults();
  }

  /**
   * listOngoingElections()
   *  - Returns summary objects for all elections that are currently open.
   *
   * @returns {Array<{electionId: string, name: string, startDate: Date, endDate: Date}>}
   */
  listOngoingElections() {
    const ongoing = [];
    for (const election of this.elections.values()) {
      if (election.isOngoing()) {
        const { electionId, name, startDate, endDate } = election.getSummary();
        ongoing.push({ electionId, name, startDate, endDate });
      }
    }
    return ongoing;
  }

  /**
   * listAllElections()
   *  - Returns summary objects for every election, open or closed.
   *
   * @returns {Array<{electionId: string, name: string, startDate: Date, endDate: Date, closed: boolean}>}
   */
  listAllElections() {
    const all = [];
    for (const election of this.elections.values()) {
      const { electionId, name, startDate, endDate, closed } = election.getSummary();
      all.push({ electionId, name, startDate, endDate, closed });
    }
    return all;
  }
}

module.exports = VotingSystem;
