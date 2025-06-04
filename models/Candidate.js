class Candidate {
    constructor(name, party, candidateId =  null) {
        this.name = name;
        this.party = party;
        this.candidateId = candidateId
        ? candidateId
        : `${Date.now().toString()}-${Math.floor(Math.random() * 1e5)}`;
        this.electionVotes = new Set();
    }

    assignToElection(electionId) {
        if (this.electionVotes.has(electionId)) {
            throw new Error(`Candidate already assigned to election ${electionId}.`);
        }
        this.electionVotes.add(electionId);
        return true;
    }

    removeFromElection(electionId) {
        if (!this.electionVotes.has(electionId)) {
            throw new Error(`Candidate not assigned to election ${electionId}.`);
        }
        this.electionVotes.delete(electionId);
        return true;
    }

    getInfo() {
        return {
            candidateId: this.candidateId,
            name: this.name,
            party: this.party,
            elections: Array.from(this.electionVotes),
        };
    }
}

module.exports = Candidate;