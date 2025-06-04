/**
 * Ballot.js
 * Immutable vote record: ties a voter to a candidate under a specific election.
 */
class Ballot {
  /**
   * @param {string} electionId  - ID of the election.
   * @param {string} voterId     - ID of the voter casting this ballot.
   * @param {string} candidateId - ID of the chosen candidate.
   * @param {Date}   [timestamp] - When the ballot is created; defaults to now.
   */
  constructor(electionId, voterId, candidateId, timestamp = null) {
    this.electionId = electionId;
    this.voterId = voterId;
    this.candidateId = candidateId;
    this.timestamp = timestamp instanceof Date ? timestamp : new Date();
  }

  /**
   * getSummary()
   *  - Returns a read-only snapshot of this ballot's data.
   *
   * @returns {{ electionId: string, voterId: string, candidateId: string, timestamp: Date }}
   */
  getSummary() {
    return {
      electionId: this.electionId,
      voterId: this.voterId,
      candidateId: this.candidateId,
      timestamp: this.timestamp,
    };
  }

  /**
   * equals(otherBallot)
   *  - Compares two Ballot instances by electionId + voterId.
   *
   * @param {Ballot} otherBallot - Another Ballot instance.
   * @returns {boolean} true if same electionId & voterId.
   */
  equals(otherBallot) {
    if (!(otherBallot instanceof Ballot)) {
      return false;
    }
    return (
      this.electionId === otherBallot.electionId &&
      this.voterId === otherBallot.voterId
    );
  }
}

module.exports = Ballot;
