class Voter {
    constructor(name, nationalId, dateOfBirth) {
        this.name = name;
        this.nationalId = nationalId;
        this.dateOfBirth = dateOfBirth;
        this.voterId = this.generateVoterId();
        this.registered = false;
        this.votedElections = [];
    }

    register() {
        if(this.nationalId) {
            this.registered = true;
            console.log(`${this.name} has been registered successfully.`);
        } else {
            throw new Error("National ID is required for registration.");
        }
    }
}
