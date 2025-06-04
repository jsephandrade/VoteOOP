/**
 * Voter.js
 * Represents a single voter: registration state, unique ID, and voting history.
 */
class Voter {
  /**
   * @param {string} name       - Full name of the voter.
   * @param {string} nationalId - Government-issued unique identifier.
   * @param {Date}   dateOfBirth- Voter's date of birth.
   */
  constructor(name, nationalId, dateOfBirth) {
    this.name = name;
    this.nationalId = nationalId;
    this.dateOfBirth = dateOfBirth;

    // System-generated ID (populated in register())
    this.voterId = null;

    // Indicates whether this voter has successfully called register()
    this.registered = false;

    // Set of election IDs in which this voter has already cast a ballot
    this.votedElections = new Set();
  }

  /**
   * register()
   *  - Validates nationalId format and age >= 18, then marks the voter as registered.
   *  - Generates a unique voterId string.
   *
   * @returns {string} The newly created voterId.
   * @throws {Error} If nationalId is invalid or age < 18.
   */
  register() {
    // 1) Validate nationalId: non-empty alphanumeric, 8–12 chars (example rule)
    const idPattern = /^[A-Z0-9]{8,12}$/;
    if (typeof this.nationalId !== "string" || !idPattern.test(this.nationalId)) {
      throw new Error("Invalid National ID format.");
    }

    // 2) Calculate age
    const today = new Date();
    const birth = new Date(this.dateOfBirth);
    const ageDifMs = today - birth;
    const ageDate = new Date(ageDifMs); // millis -> date
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < 18) {
      throw new Error("Voter must be at least 18 years old to register.");
    }

    // 3) Generate a unique voterId (timestamp + random suffix)
    const randomSuffix = Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, "0");
    this.voterId = `${Date.now().toString()}-${randomSuffix}`;

    // 4) Mark as registered
    this.registered = true;
    return this.voterId;
  }

  /**
   * authenticate(inputId)
   *  - Checks whether the provided inputId matches this.voterId.
   *
   * @param {string} inputId - Voter-supplied ID at login time.
   * @returns {boolean} true if matches and this.registered === true; otherwise false.
   */
  authenticate(inputId) {
    if (!this.registered) return false;
    return inputId === this.voterId;
  }

  /**
   * hasVotedIn(electionId)
   *  - Checks if this voter has already voted in the given election.
   *
   * @param {string} electionId - Unique ID of an election.
   * @returns {boolean} true if already voted; false otherwise.
   */
  hasVotedIn(electionId) {
    return this.votedElections.has(electionId);
  }

  /**
   * markVoted(electionId)
   *  - Marks that this voter has cast a ballot in electionId.
   *
   * @param {string} electionId - Unique ID of an election.
   * @returns {boolean} true if successfully marked.
   * @throws {Error} If this voter has already voted in that election.
   */
  markVoted(electionId) {
    if (this.votedElections.has(electionId)) {
      throw new Error(`This voter has already voted in election ${electionId}.`);
    }
    this.votedElections.add(electionId);
    return true;
  }
}

module.exports = Voter;
