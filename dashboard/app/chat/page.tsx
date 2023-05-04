// just an example to test app dir
async function getProjects() {
  const projects = ['test', 'test2', 'test3']

  return projects
}

export default async function Dashboard() {
  const projects = await getProjects()

  return (
    <ul>
      {projects.map((project) => (
        <li key={project}>{project}</li>
      ))}
    </ul>
  )
}
