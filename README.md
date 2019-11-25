## Amazon ECS "Render Task Definition" Action

Inserts the container definition into an Amazon ECS task definition JSON file, creating a new task definition file.

## Usage

```yaml
    - name: Render Amazon ECS task definition
      id: render-web-container
      uses: aws-actions/amazon-ecs-render-task-definition@v1
      with:
        task-definition: task-definition.json # output file (required)
        container-name: web # container name (required)
        image: amazon/amazon-ecs-sample:latest # image to insert (required)
        aws-sm-name: MySecretName # aws secrets manager name (optional)

    - name: Deploy to Amazon ECS service
      uses: aws-actions/amazon-ecs-deploy-task-definition@v1
      with:
        task-definition: ${{ steps.render-web-container.outputs.task-definition }}
        service: my-service
        cluster: my-cluster
```

## License Summary

This code is made available under the MIT license.
