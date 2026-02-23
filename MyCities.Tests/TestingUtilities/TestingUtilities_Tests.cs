using MyCitiesWebApi.Testing;

namespace MyCities.Tests.TestingUtilities
{
    public class TransientFailureInjector_Tests
    {
        [Fact]
        public void ShouldFail_WhenKeyWasNeverArmed_ReturnsFalse()
        {
            // Arrange
            var key = $"never-armed-{Guid.NewGuid():N}";

            // Act
            var result = TransientFailureInjector.ShouldFail(key);

            // Assert
            Assert.False(result);
        }

        [Fact]
        public void Arm_WhenFailuresToThrowIsNegative_TreatsAsZero()
        {
            // Arrange
            var key = $"neg-{Guid.NewGuid():N}";
            TransientFailureInjector.Arm(key, -5);

            // Act
            var first = TransientFailureInjector.ShouldFail(key);
            var second = TransientFailureInjector.ShouldFail(key);

            // Assert
            Assert.False(first);
            Assert.False(second);
        }

        [Fact]
        public void Arm_WhenFailuresToThrowIsZero_ShouldFailAlwaysReturnsFalse()
        {
            // Arrange
            var key = $"zero-{Guid.NewGuid():N}";
            TransientFailureInjector.Arm(key, 0);

            // Act
            var first = TransientFailureInjector.ShouldFail(key);
            var second = TransientFailureInjector.ShouldFail(key);

            // Assert
            Assert.False(first);
            Assert.False(second);
        }

        [Fact]
        public void ShouldFail_WhenArmedWithN_ReturnsTrueExactlyNTimesThenFalse()
        {
            // Arrange
            var key = $"n-{Guid.NewGuid():N}";
            TransientFailureInjector.Arm(key, 3);

            // Act
            var r1 = TransientFailureInjector.ShouldFail(key);
            var r2 = TransientFailureInjector.ShouldFail(key);
            var r3 = TransientFailureInjector.ShouldFail(key);
            var r4 = TransientFailureInjector.ShouldFail(key);
            var r5 = TransientFailureInjector.ShouldFail(key);

            // Assert
            Assert.True(r1);
            Assert.True(r2);
            Assert.True(r3);
            Assert.False(r4);
            Assert.False(r5);
        }

        [Fact]
        public void Arm_CanBeCalledAgainToResetFailuresForSameKey()
        {
            // Arrange
            var key = $"reset-{Guid.NewGuid():N}";
            TransientFailureInjector.Arm(key, 2);

            // Consume one failure
            Assert.True(TransientFailureInjector.ShouldFail(key));

            // Act
            TransientFailureInjector.Arm(key, 2);

            // Assert (should be reset to 2)
            Assert.True(TransientFailureInjector.ShouldFail(key));
            Assert.True(TransientFailureInjector.ShouldFail(key));
            Assert.False(TransientFailureInjector.ShouldFail(key));
        }

        [Fact]
        public void DifferentKeys_DoNotInterfereWithEachOther()
        {
            // Arrange
            var keyA = $"A-{Guid.NewGuid():N}";
            var keyB = $"B-{Guid.NewGuid():N}";

            TransientFailureInjector.Arm(keyA, 1);
            TransientFailureInjector.Arm(keyB, 2);

            // Act + Assert
            Assert.True(TransientFailureInjector.ShouldFail(keyA));
            Assert.False(TransientFailureInjector.ShouldFail(keyA));

            Assert.True(TransientFailureInjector.ShouldFail(keyB));
            Assert.True(TransientFailureInjector.ShouldFail(keyB));
            Assert.False(TransientFailureInjector.ShouldFail(keyB));
        }

        [Fact]
        public void AfterFailuresAreExhausted_SubsequentCallsRemainFalse()
        {
            // Arrange
            var key = $"exhausted-{Guid.NewGuid():N}";
            TransientFailureInjector.Arm(key, 1);

            // Act
            Assert.True(TransientFailureInjector.ShouldFail(key));
            var after1 = TransientFailureInjector.ShouldFail(key);
            var after2 = TransientFailureInjector.ShouldFail(key);

            // Assert
            Assert.False(after1);
            Assert.False(after2);
        }
    }
}

