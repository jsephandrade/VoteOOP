class Voter {
    constructor(name, nationalId, dateOfBirth) {
        this.name = name;
        this.nationalId = nationalId;
        this.dateOfBirth = dateOfBirth;

        this.voterId = null;
        this.registered = false;
        this.votedElections = new Set();
    }

    register() {
        const idPattern = /^[A-Z0-9]{8,12}$/;
        if (typeof this.nationalId !== "string" || !idPattern.test(this.nationalId)) {
            throw new Error("Invalid national ID format.");
        }

        const today = new Date();
        const birth = new Date(this.dateOfBirth);
        const ageDifMs = today - birth;
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);

        if (age < 18) {
            throw new Error("Voter must be at least 18 years old to register.");
        }

        const randomSuffix = Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
        this.voterId = `${Date.now().toString()}-${randomSuffix}`;

        this.registered = true;
        return this.voterId;
    }

    authenticate(inputId) {
        if (!this.registered) return false;
        return inputId == this.voterId;
    }

    hasVotedIn(electionId) {
        return this.votedElections.has(electionId);
    }

    markVoted(electionId) {
        if(this.votedElections.has(electionId)) {
            throw new Error(`This voter has already voted in election ${electionId}.`);
        }
        this.votedElections.add(electionId);
        return true;
    }
}

module.exports = Voter;
