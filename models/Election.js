/**
 * Election.js
 * Manages a single election: candidates, registered voters, casting ballots, tallying.
 */

const Voter = require("./Voter");         // relative path to Voter.js
const Candidate = require("./Candidate"); // relative path to Candidate.js
const Ballot = require("./Ballot");       // relative path to Ballot.js

class Election {
  /**
   * @param {string} electionId - Unique identifier for this election.
   * @param {string} name       - Human-readable title of the election.
   * @param {Date}   startDate  - When voting opens.
   * @param {Date}   endDate    - When voting closes.
   */
  constructor(electionId, name, startDate, endDate) {
    this.electionId = electionId;
    this.name = name;
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);

    // Map candidateId => Candidate instance
    this.candidates = new Map();

    // Map voterId => Voter instance
    this.registeredVoters = new Map();

    // Array of Ballot objects cast in this election
    this.ballots = [];

    // false until closeElection() is called or endDate passes
    this.closed = false;
  }

  /**
   * registerVoter(voter)
   *  - Adds a Voter instance to this election's roster.
   *
   * @param {Voter} voter - Must be an already-registered system voter.
   * @returns {boolean} true if added successfully.
   * @throws {Error} If election is closed, or voter.registered===false, or already registered.
   */
  registerVoter(voter) {
    if (this.closed) {
      throw new Error("Cannot register voter. Election is already closed.");
    }
    // Ensure passed object is actually a Voter
    if (!(voter instanceof Voter) || voter.registered === false) {
      throw new Error("Voter is not registered in the system.");
    }
    if (this.registeredVoters.has(voter.voterId)) {
      throw new Error("Voter already registered for this election.");
    }
    this.registeredVoters.set(voter.voterId, voter);
    return true;
  }

  /**
   * addCandidate(candidate)
   *  - Includes a Candidate in this election's ballot choices.
   *
   * @param {Candidate} candidate - A system-registered Candidate instance.
   * @returns {boolean} true if added successfully.
   * @throws {Error} If election is closed or candidate invalid.
   */
  addCandidate(candidate) {
    if (this.closed) {
      throw new Error("Cannot add candidate. Election is already closed.");
    }
    if (!(candidate instanceof Candidate)) {
      throw new Error("Invalid candidate.");
    }
    // If candidate not yet assigned to this election, assign them
    if (!candidate.electionIds.has(this.electionId)) {
      candidate.assignToElection(this.electionId);
    }
    if (this.candidates.has(candidate.candidateId)) {
      throw new Error("Candidate already in this election.");
    }
    this.candidates.set(candidate.candidateId, candidate);
    return true;
  }

  /**
   * removeCandidate(candidateId)
   *  - Removes a candidate from this election if no ballots have been cast yet.
   *
   * @param {string} candidateId - Unique ID of the candidate.
   * @returns {boolean} true if removed.
   * @throws {Error} If ballots exist or candidate not in this election.
   */
  removeCandidate(candidateId) {
    if (this.ballots.length > 0) {
      throw new Error("Cannot remove candidate once voting has started.");
    }
    if (!this.candidates.has(candidateId)) {
      throw new Error(`Candidate not found in election ${this.electionId}.`);
    }
    // Also remove electionId from the candidate's own record
    const candidate = this.candidates.get(candidateId);
    candidate.removeFromElection(this.electionId);

    this.candidates.delete(candidateId);
    return true;
  }

  /**
   * isOngoing()
   *  - Returns true if now ∈ [startDate, endDate] and election not manually closed.
   *
   * @returns {boolean}
   */
  isOngoing() {
    if (this.closed) return false;
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }

  /**
   * castBallot(ballot)
   *  - Validates and records a Ballot.
   *
   * @param {Ballot} ballot - Must refer to this.electionId, a registered voter, and a valid candidate.
   * @returns {boolean} true if vote recorded.
   * @throws {Error} If election not open, voter not registered, already voted, or invalid candidate.
   */
  castBallot(ballot) {
    if (!(ballot instanceof Ballot)) {
      throw new Error("Invalid ballot object.");
    }
    // 1) Ensure election is open
    if (!this.isOngoing()) {
      throw new Error("Election is not open for voting at this time.");
    }
    // 2) Check ballot.electionId matches
    if (ballot.electionId !== this.electionId) {
      throw new Error("Ballot election ID mismatch.");
    }
    // 3) Check voter eligibility
    const voterId = ballot.voterId;
    if (!this.registeredVoters.has(voterId)) {
      throw new Error("Voter is not registered for this election.");
    }
    const voter = this.registeredVoters.get(voterId);
    if (voter.hasVotedIn(this.electionId)) {
      throw new Error("Voter has already cast a ballot in this election.");
    }
    // 4) Check candidate is part of this election
    if (!this.candidates.has(ballot.candidateId)) {
      throw new Error("Candidate is not in this election.");
    }

    // 5) Record vote
    voter.markVoted(this.electionId); // mark voter as having voted
    this.ballots.push(ballot);        // store the ballot
    return true;
  }

  /**
   * tallyVotes()
   *  - Counts votes per candidate and returns a plain object.
   *
   * @returns {{ [candidateId: string]: number }} Vote counts per candidateId.
   * @throws {Error} If election still open.
   */
  tallyVotes() {
    if (!this.closed) {
      throw new Error("Cannot tally votes until the election is closed.");
    }
    // Initialize counts to zero
    const counts = {};
    for (const [candidateId] of this.candidates.entries()) {
      counts[candidateId] = 0;
    }
    // Tally each ballot
    for (const ballot of this.ballots) {
      counts[ballot.candidateId] = counts[ballot.candidateId] + 1;
    }
    return counts;
  }

  /**
   * closeElection()
   *  - Manually ends voting (sets closed = true).
   *
   * @returns {boolean} true if successfully closed.
   * @throws {Error} If already closed.
   */
  closeElection() {
    if (this.closed) {
      throw new Error("Election already closed.");
    }
    this.closed = true;
    return true;
  }

  /**
   * getResults()
   *  - Returns an array of { candidateId, name, party, votes }, sorted by votes desc.
   *
   * @returns {Array<{candidateId: string, name: string, party: string, votes: number}>}
   * @throws {Error} If election not yet closed.
   */
  getResults() {
    if (!this.closed) {
      throw new Error("Cannot get results until the election is closed.");
    }

    // 1) Get raw vote counts
    const rawCounts = this.tallyVotes(); // { candidateId: count, ... }

    // 2) Build array of result objects
    const resultArr = [];
    for (const [candidateId, count] of Object.entries(rawCounts)) {
      const candidate = this.candidates.get(candidateId);
      resultArr.push({
        candidateId: candidateId,
        name: candidate.name,
        party: candidate.party,
        votes: count,
      });
    }

    // 3) Sort descending by votes
    resultArr.sort((a, b) => b.votes - a.votes);
    return resultArr;
  }

  /**
   * getSummary()
   *  - Returns an object summarizing election metadata.
   *
   * @returns {{
   *   electionId: string,
   *   name: string,
   *   startDate: Date,
   *   endDate: Date,
   *   totalRegisteredVoters: number,
   *   totalCandidates: number,
   *   totalBallotsCast: number,
   *   closed: boolean
   * }}
   */
  getSummary() {
    return {
      electionId: this.electionId,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      totalRegisteredVoters: this.registeredVoters.size,
      totalCandidates: this.candidates.size,
      totalBallotsCast: this.ballots.length,
      closed: this.closed,
    };
  }
}

module.exports = Election;
