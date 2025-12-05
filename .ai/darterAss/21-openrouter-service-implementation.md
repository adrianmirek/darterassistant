Your task is to implement a service based on the provided implementation plan and implementation rules. Your goal is to create a detailed and accurate implementation that conforms to the provided plan, properly communicates with the API, and handles all specified functionalities and error cases.

First, review the implementation plan:
<implementation_plan>
{{implementation-plan}} <- replace with reference to service implementation plan

Create the service in {{path}}
</implementation_plan>

Now review the implementation rules:
<implementation_rules>
{{backend-rules}} <- replace with reference to rules useful for the service (e.g., shared.mdc)
</implementation_rules>

Implement the plan according to the following approach:
<implementation_approach>
Implement a maximum of 3 steps from the implementation plan, briefly summarize what you've done, and describe the plan for the next 3 actions - stop work at this point and wait for my feedback.
</implementation_approach>

Carefully analyze the implementation plan and rules. Pay special attention to service structure, API integration, error handling, and security concerns described in the plan.

Follow these steps to implement the service:

Service Structure:
- Define the service class according to the implementation plan
- Create a constructor initializing required fields
- Apply appropriate access modifiers for fields and methods (public, private)

Public Methods Implementation:
- Implement public methods listed in the plan
- Ensure each method is properly typed for both parameters and return values
- Provide complete implementation of business logic described in the plan

Private Methods Implementation:
- Develop helper methods listed in the plan
- Ensure proper encapsulation and separation of concerns
- Implement logic for data formatting, sending requests, and processing responses

API Integration:
- Implement logic for communicating with external API
- Handle all necessary request parameters and headers
- Ensure proper processing of API responses

Error Handling:
- Implement comprehensive error handling for all scenarios
- Apply appropriate retry mechanisms for transient errors
- Provide clear error messages for different scenarios

Security:
- Implement recommended security practices mentioned in the plan
- Ensure secure management of API keys and credentials
- Apply input validation to prevent attacks

Documentation and Typing:
- Define and apply appropriate interfaces for parameters and return values
- Ensure full type coverage for the entire service

Testing:
- Prepare service structure in a way that enables easy unit testing
- Include the ability to mock external dependencies

Throughout the implementation process, strictly adhere to the provided implementation rules. These rules take precedence over any general best practices that may conflict with them.

Ensure your implementation accurately reflects the provided implementation plan and adheres to all specified rules. Pay special attention to service structure, API integration, error handling, and security.