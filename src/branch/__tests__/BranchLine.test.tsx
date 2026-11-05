import { render, screen } from '@testing-library/react-native'

import { BranchLine } from '../BranchLine'

describe('BranchLine', () => {
  it('shows the branch name when a branch is assigned', () => {
    render(<BranchLine branch={{ id: 1, name: 'Lekki' }} />)

    expect(screen.getByText('Branch: Lekki')).toBeTruthy()
  })

  it('shows a fallback when no branch is assigned', () => {
    render(<BranchLine branch={null} />)

    expect(screen.getByText('Branch: Not assigned')).toBeTruthy()
  })
})
