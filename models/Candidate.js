/**
 * Candidate.js
 * Represents one candidate, including the set of elections they participate in.
 */
class Candidate {
  /**
   * @param {string} name         - Candidate's full name.
   * @param {string} party        - Political party or “Independent”.
   * @param {string} [candidateId]- Optional unique ID; if omitted, auto-generate.
   */
  constructor(name, party, candidateId = null) {
    this.name = name;
    this.party = party;

    // If candidateId is provided, use it; otherwise generate one.
    this.candidateId = candidateId
      ? candidateId
      : `${Date.now().toString()}-${Math.floor(Math.random() * 1e5)}`;

    // Track which elections this candidate is assigned to
    this.electionIds = new Set();
  }

  /**
   * assignToElection(electionId)
   *  - Adds this candidate to electionId's roster.
   *
   * @param {string} electionId - Unique ID of an election.
   * @returns {boolean} true if successfully assigned.
   * @throws {Error} If already assigned to that election.
   */
  assignToElection(electionId) {
    if (this.electionIds.has(electionId)) {
      throw new Error(`Candidate already assigned to election ${electionId}.`);
    }
    this.electionIds.add(electionId);
    return true;
  }

  /**
   * removeFromElection(electionId)
   *  - Removes this candidate from electionId's roster.
   *
   * @param {string} electionId - Unique ID of an election.
   * @returns {boolean} true if successfully removed.
   * @throws {Error} If not currently assigned to that election.
   */
  removeFromElection(electionId) {
    if (!this.electionIds.has(electionId)) {
      throw new Error(`Candidate not found in election ${electionId}.`);
    }
    this.electionIds.delete(electionId);
    return true;
  }

  /**
   * getInfo()
   *  - Returns a plain object summarizing candidate details.
   *
   * @returns {{ candidateId: string, name: string, party: string, elections: string[] }}
   */
  getInfo() {
    return {
      candidateId: this.candidateId,
      name: this.name,
      party: this.party,
      elections: Array.from(this.electionIds),
    };
  }
}

module.exports = Candidate;
