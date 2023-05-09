export default class None {
    private static instance: None;

    public static getInstance(): None { 
        if (!None.instance) {
            None.instance = new None();
        }

        return None.instance;
    }
}
