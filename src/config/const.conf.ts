class Constants {
    private readonly InstanceUrl: string = "https://gwcteq-partner.domo.com";

    getInstanceUrl(): string {
        return this.InstanceUrl;
    }
}

export const constants = new Constants();